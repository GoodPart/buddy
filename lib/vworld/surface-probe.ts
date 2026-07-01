/**
 * 주행면 고도 — 3단계 resolver
 *
 * ① Raycast + 3D Tile Feature → Bridge Mesh Height
 * ② GIS Bridge Polygon (또는 interim: Tmap 안내 hint offset)
 * ③ Terrain
 *
 * Raycast는 항상 실행 — vWorld Tile Feature(du, 12m+ 덱)만 mesh 적용.
 * Tmap hint는 mesh 없을 때 hint-offset fallback 용도.
 */

import type { ElevatedSegment } from "@/lib/tmap/elevated-segments";
import { lookupElevatedOffsetM } from "@/lib/tmap/elevated-segments";
import { buildCumulativeDistances } from "@/lib/tmap/geo";
import {
  ROUTE_TESSELLATE_MAX_SEGMENT_M,
  tessellateRouteCoords,
} from "@/lib/tmap/route-line";
import { bridgeGisProvider } from "./bridge-gis-layer";
import {
  drillPickHitsWithMetadata,
  DECK_MIN_ABOVE_TERRAIN_RELAXED_M,
  hitIsVWorldDeckFeature,
  hitLooksLikeBridgeMesh,
  type RayHitInfo,
} from "./ray-hit-inspect";

const PROBE_CACHE_MS = 1000;
const PROBE_GRID_SCALE = 3500;

const ROAD_MESH_MIN_ABOVE_TERRAIN_M = 0.5;
const ROAD_MESH_MAX_ABOVE_TERRAIN_M = 5;
const DECK_MIN_ABOVE_TERRAIN_M = 12;
const DECK_MAX_ABOVE_TERRAIN_M = 55;
const OVERPASS_LAYER_GAP_M = 8;
const DECK_CONFIRM_TOLERANCE_M = 4;
const TERRAIN_LOCK_BAND_M = 3;

export const SURFACE_CLEARANCE_M = 1.2;
/** 경로 라인 Z-fighting 방지용 미세 오프셋 — 차량 groundHeight와 동일 기준면 */
export const ROUTE_SURFACE_Z_BIAS_M = 0.2;

/** 60fps 기준 프레임당 최대 상승/하강 (m) */
const MAX_ASCENT_PER_FRAME_M = 0.4;
const MAX_DECK_ASCENT_PER_FRAME_M = 2.5;
const MAX_DESCENT_PER_FRAME_M = 3.0;
const MAX_DECK_DESCENT_PER_FRAME_M = 1.5;
/** mesh/교량 진입 — 이 이상 차이면 즉시 스냅 */
const BRIDGE_SNAP_DELTA_M = 6;
const DECK_EXIT_SNAP_M = 8;
const HEIGHT_DEAD_ZONE_TERRAIN_M = 0.6;
const HEIGHT_DEAD_ZONE_DECK_M = 0.25;
/** probe 재실행 최소 이동 (~1.8m @ lat 37°) — 차량 1m 보간과 정렬 */
const PROBE_MIN_MOVE_DEG = 0.000016;
/** deck 모드 유지 — 지면과 이 거리 이상이면 아직 교량 위 */
const DECK_LATCH_MIN_ABOVE_TERRAIN_M = 5;
/** hint 구간 진입 후 지형이 이만큼 올랐으면 DEM이 도로 형상을 이미 반영 — hint 생략 */
const TERRAIN_BUMP_HINT_SUPPRESS_M = 3.5;

export type SurfaceSource = "mesh" | "gis" | "hint-offset" | "terrain";

export interface DrivingSurfaceState {
  lng: number;
  lat: number;
  /** 안정화된 지면 고도 (차량 clearance 제외) */
  groundHeightM: number;
  /** 차량 배치 고도 = groundHeightM + clearance */
  heightM: number;
  source: SurfaceSource;
  timestamp: number;
}

type SurfaceMode = "terrain" | "deck";

type Ws3dProbeRuntime = {
  viewer?: {
    scene?: {
      globe?: {
        getHeight: (carto: {
          longitude: number;
          latitude: number;
        }) => number | undefined;
      };
      sampleHeight?: (cartographic: {
        longitude: number;
        latitude: number;
        height?: number;
      }) => number | undefined;
    };
  };
  common?: {
    Cartographic?: {
      fromDegrees: (
        lng: number,
        lat: number,
        height?: number
      ) => { longitude: number; latitude: number; height?: number };
    };
  };
};

export type SurfaceProbe = {
  terrainH: number;
  targetH: number;
  source: SurfaceSource;
  /** Raycast에 교량 덱 높이(12m+) 후보가 있었는지 — Mesh 유무 판별 참고 */
  meshDeckCandidate: boolean;
  deckH: number | null;
  underOverpassH: number | null;
};

const rawHeightCache = new Map<
  string,
  { at: number; probe: SurfaceProbe }
>();

function getWs3d(): Ws3dProbeRuntime | null {
  return (window as unknown as { ws3d?: Ws3dProbeRuntime }).ws3d ?? null;
}

function cacheKey(lng: number, lat: number, elevated: boolean): string {
  return `${elevated ? 1 : 0}_${Math.round(lng * PROBE_GRID_SCALE)}_${Math.round(lat * PROBE_GRID_SCALE)}`;
}

export function readTerrainHeightAt(lng: number, lat: number): number {
  const ws3d = getWs3d();
  if (!ws3d) return 0;

  try {
    const carto = ws3d.common?.Cartographic?.fromDegrees(lng, lat);
    if (!carto) return 0;
    const h = ws3d.viewer?.scene?.globe?.getHeight(carto);
    return h != null && Number.isFinite(h) ? h : 0;
  } catch {
    return 0;
  }
}

function readSampleHeight(
  ws3d: Ws3dProbeRuntime,
  lng: number,
  lat: number,
  hintH: number
): number | null {
  const sampleHeight = ws3d.viewer?.scene?.sampleHeight;
  const Cartographic = ws3d.common?.Cartographic;
  if (!sampleHeight || !Cartographic) return null;

  try {
    const carto = Cartographic.fromDegrees(lng, lat, hintH);
    const h = sampleHeight.call(ws3d.viewer!.scene!, carto);
    if (h != null && Number.isFinite(h)) return h;
  } catch {
    /* ignore */
  }

  return null;
}

function confirmOnBridgeDeck(
  ws3d: Ws3dProbeRuntime,
  lng: number,
  lat: number,
  terrainH: number,
  deckH: number,
  hits: RayHitInfo[],
  minDeckDelta = DECK_MIN_ABOVE_TERRAIN_M
): boolean {
  if (deckH - terrainH < minDeckDelta) return false;

  const tileDeck = hits.filter(
    (h) =>
      hitIsVWorldDeckFeature(h, terrainH, minDeckDelta) &&
      Math.abs(h.heightM - deckH) <= DECK_CONFIRM_TOLERANCE_M
  );
  if (tileDeck.length > 0) return true;

  const tagged = hits.filter(
    (h) =>
      hitLooksLikeBridgeMesh(h) &&
      Math.abs(h.heightM - deckH) <= DECK_CONFIRM_TOLERANCE_M
  );
  if (tagged.length > 0) return true;

  const low = readSampleHeight(ws3d, lng, lat, terrainH + 1.5);
  if (low != null) {
    if (Math.abs(low - deckH) <= DECK_CONFIRM_TOLERANCE_M) return true;
    if (low - terrainH <= ROAD_MESH_MAX_ABOVE_TERRAIN_M) return false;
  }

  const mid = readSampleHeight(ws3d, lng, lat, terrainH + 8);
  if (mid != null && Math.abs(mid - deckH) <= DECK_CONFIRM_TOLERANCE_M) {
    return true;
  }

  return false;
}

function pickDeckFromHits(
  terrainH: number,
  hits: RayHitInfo[],
  minDeckDelta = DECK_MIN_ABOVE_TERRAIN_M
): number | null {
  const vworldTileDecks = hits
    .filter((h) => hitIsVWorldDeckFeature(h, terrainH, minDeckDelta))
    .map((h) => h.heightM);
  if (vworldTileDecks.length) {
    return Math.min(...vworldTileDecks);
  }

  const genericBridgeMeshes = hits
    .filter((h) => hitLooksLikeBridgeMesh(h))
    .map((h) => h.heightM)
    .filter((h) => {
      const d = h - terrainH;
      return d >= minDeckDelta && d <= DECK_MAX_ABOVE_TERRAIN_M;
    });
  if (genericBridgeMeshes.length) {
    return Math.min(...genericBridgeMeshes);
  }

  return null;
}

function pickUnderOverpass(
  terrainH: number,
  hits: RayHitInfo[]
): number | null {
  const heights = hits.map((h) => h.heightM);
  const roadMeshes = heights.filter((h) => {
    const d = h - terrainH;
    return d >= ROAD_MESH_MIN_ABOVE_TERRAIN_M && d <= ROAD_MESH_MAX_ABOVE_TERRAIN_M;
  });
  const decks = heights.filter((h) => {
    const d = h - terrainH;
    return d >= DECK_MIN_ABOVE_TERRAIN_M && d <= DECK_MAX_ABOVE_TERRAIN_M;
  });

  if (!roadMeshes.length || !decks.length) return null;

  const roadH = Math.min(...roadMeshes);
  const deckH = Math.min(...decks);
  if (deckH - roadH >= OVERPASS_LAYER_GAP_M) return roadH;
  return null;
}

/** ① Raycast + ② GIS/hint + ③ terrain */
function probeElevatedSurface(
  ws3d: Ws3dProbeRuntime,
  lng: number,
  lat: number,
  terrainH: number,
  hintOffsetM: number,
  deckLatched = false
): SurfaceProbe {
  const minDeckDelta = deckLatched
    ? DECK_MIN_ABOVE_TERRAIN_RELAXED_M
    : DECK_MIN_ABOVE_TERRAIN_M;
  const hits = drillPickHitsWithMetadata(lng, lat, terrainH, 20);
  const deckCandidate = pickDeckFromHits(terrainH, hits, minDeckDelta);
  const underOverpassH = pickUnderOverpass(terrainH, hits);

  const base: SurfaceProbe = {
    terrainH,
    targetH: terrainH,
    source: "terrain",
    meshDeckCandidate: deckCandidate != null,
    deckH: null,
    underOverpassH,
  };

  if (underOverpassH != null) {
    return { ...base, targetH: underOverpassH, source: "terrain" };
  }

  if (deckCandidate != null) {
    if (
      confirmOnBridgeDeck(
        ws3d,
        lng,
        lat,
        terrainH,
        deckCandidate,
        hits,
        minDeckDelta
      )
    ) {
      return {
        ...base,
        targetH: deckCandidate,
        source: "mesh",
        deckH: deckCandidate,
      };
    }
  }

  const gis = bridgeGisProvider.lookup(lng, lat);
  if (gis) {
    return {
      ...base,
      targetH: gis.deckAbsoluteM,
      source: "gis",
    };
  }

  if (hintOffsetM > 0 && !base.meshDeckCandidate) {
    return {
      ...base,
      targetH: terrainH + hintOffsetM,
      source: "hint-offset",
    };
  }

  return base;
}

function evaluateSurfaceProbe(
  lng: number,
  lat: number,
  hintOffsetM: number,
  deckLatched = false
): SurfaceProbe {
  const terrainH = readTerrainHeightAt(lng, lat);
  const ws3d = getWs3d();

  if (!ws3d) {
    const gis = bridgeGisProvider.lookup(lng, lat);
    if (gis) {
      return {
        terrainH,
        targetH: gis.deckAbsoluteM,
        source: "gis",
        meshDeckCandidate: false,
        deckH: null,
        underOverpassH: null,
      };
    }
    if (hintOffsetM > 0) {
      return {
        terrainH,
        targetH: terrainH + hintOffsetM,
        source: "hint-offset",
        meshDeckCandidate: false,
        deckH: null,
        underOverpassH: null,
      };
    }
    return {
      terrainH,
      targetH: terrainH,
      source: "terrain",
      meshDeckCandidate: false,
      deckH: null,
      underOverpassH: null,
    };
  }

  const key = cacheKey(lng, lat, true);
  const now = Date.now();
  const cached = rawHeightCache.get(key);
  if (cached && now - cached.at < PROBE_CACHE_MS) {
    return cached.probe;
  }

  const probe = probeElevatedSurface(
    ws3d,
    lng,
    lat,
    terrainH,
    hintOffsetM,
    deckLatched
  );
  rawHeightCache.set(key, { at: now, probe });

  if (rawHeightCache.size > 120) {
    for (const [k, entry] of rawHeightCache) {
      if (now - entry.at > PROBE_CACHE_MS * 3) rawHeightCache.delete(k);
    }
  }

  return probe;
}

function stabilizeHeight(
  previous: number | null,
  target: number,
  inDeckMode = false,
  allowSnapUp = true,
  allowSnapDown = true
): number {
  if (previous == null || !Number.isFinite(previous)) return target;

  const delta = target - previous;
  if (allowSnapUp && Math.abs(delta) >= BRIDGE_SNAP_DELTA_M) return target;
  if (allowSnapDown && delta <= -DECK_EXIT_SNAP_M) return target;

  const deadZone = inDeckMode ? HEIGHT_DEAD_ZONE_DECK_M : HEIGHT_DEAD_ZONE_TERRAIN_M;
  if (Math.abs(delta) < deadZone) return previous;

  const maxStep =
    delta > 0
      ? inDeckMode
        ? MAX_DECK_ASCENT_PER_FRAME_M
        : MAX_ASCENT_PER_FRAME_M
      : inDeckMode
        ? MAX_DECK_DESCENT_PER_FRAME_M
        : MAX_DESCENT_PER_FRAME_M;
  if (Math.abs(delta) > maxStep) {
    return previous + Math.sign(delta) * maxStep;
  }

  return target;
}

function movedEnough(
  lng: number,
  lat: number,
  lastLng: number,
  lastLat: number
): boolean {
  if (!Number.isFinite(lastLng)) return true;
  return (
    Math.abs(lng - lastLng) > PROBE_MIN_MOVE_DEG ||
    Math.abs(lat - lastLat) > PROBE_MIN_MOVE_DEG
  );
}

function shouldSuppressHintOffset(
  terrainH: number,
  hintEntryTerrainH: number | null
): boolean {
  if (hintEntryTerrainH == null) return false;
  return terrainH - hintEntryTerrainH >= TERRAIN_BUMP_HINT_SUPPRESS_M;
}

export class DrivingSurfaceHeightTracker {
  private stableH: number | null = null;
  private targetH: number | null = null;
  private cameraSmoothH: number | null = null;
  private lastProbeLng = Number.NaN;
  private lastProbeLat = Number.NaN;
  private lastSource: SurfaceSource = "terrain";
  private mode: SurfaceMode = "terrain";
  private elevatedSegments: ElevatedSegment[] = [];
  private lastHintOffsetM = 0;
  private hintZoneEntryTerrainH: number | null = null;
  private frameState: DrivingSurfaceState | null = null;
  private frameStateKey = "";

  setElevatedSegments(segments: ElevatedSegment[]): void {
    this.elevatedSegments = segments;
  }

  private resolveTarget(probe: SurfaceProbe): number {
    const wantsDeck = probe.source === "mesh" && probe.deckH != null;

    if (wantsDeck) {
      if (this.mode === "terrain") {
        this.mode = "deck";
      }
    }

    if (this.mode === "deck" && !wantsDeck) {
      const stillOnDeck =
        probe.meshDeckCandidate ||
        (this.stableH != null &&
          this.stableH - probe.terrainH >= DECK_LATCH_MIN_ABOVE_TERRAIN_M);
      if (!stillOnDeck) {
        this.mode = "terrain";
      }
    }

    if (probe.underOverpassH != null) {
      this.mode = "terrain";
      return probe.underOverpassH;
    }

    if (this.mode === "deck" && probe.deckH != null) {
      return probe.deckH;
    }

    if (probe.source === "gis" || probe.source === "hint-offset") {
      return probe.targetH;
    }

    return probe.terrainH;
  }

  /** probe + resolve — movedEnough 무시 옵션 (경로 정점 샘플링) */
  private runProbeUpdate(
    lng: number,
    lat: number,
    traveledM: number,
    force = false
  ): void {
    const hintOffset = lookupElevatedOffsetM(traveledM, this.elevatedSegments);
    const prevHintOffsetM = this.lastHintOffsetM;

    if (hintOffset > 0 && prevHintOffsetM === 0) {
      this.hintZoneEntryTerrainH = readTerrainHeightAt(lng, lat);
    } else if (hintOffset === 0) {
      this.hintZoneEntryTerrainH = null;
    }
    this.lastHintOffsetM = hintOffset;

    if (!force && !movedEnough(lng, lat, this.lastProbeLng, this.lastProbeLat)) {
      return;
    }

    const deckLatched = this.mode === "deck" || this.lastSource === "mesh";
    const probe = evaluateSurfaceProbe(lng, lat, hintOffset, deckLatched);
    let target = this.resolveTarget(probe);
    let effectiveSource = probe.source;

    if (
      probe.source === "hint-offset" &&
      shouldSuppressHintOffset(probe.terrainH, this.hintZoneEntryTerrainH)
    ) {
      target = probe.terrainH;
      effectiveSource = "terrain";
    }

    if (
      this.lastSource === "mesh" &&
      effectiveSource === "terrain" &&
      this.mode !== "deck" &&
      !probe.meshDeckCandidate &&
      this.stableH != null &&
      this.stableH - probe.terrainH >= DECK_EXIT_SNAP_M
    ) {
      target = probe.terrainH;
    }

    if (
      (this.lastSource === "hint-offset" || prevHintOffsetM > 0) &&
      hintOffset === 0 &&
      effectiveSource === "terrain" &&
      this.stableH != null &&
      this.stableH - probe.terrainH >= DECK_EXIT_SNAP_M
    ) {
      target = probe.terrainH;
    }

    if (
      effectiveSource === "terrain" &&
      Math.abs(target - probe.terrainH) < TERRAIN_LOCK_BAND_M
    ) {
      target = probe.terrainH;
    }

    this.targetH = target;
    this.lastSource =
      this.mode === "deck" && probe.source === "terrain" && probe.meshDeckCandidate
        ? "mesh"
        : effectiveSource;
    this.lastProbeLng = lng;
    this.lastProbeLat = lat;
  }

  private stabilizeFromTarget(lng: number, lat: number): number {
    const fallbackTerrain = readTerrainHeightAt(lng, lat);
    const target = this.targetH ?? fallbackTerrain;
    const onDeck = this.mode === "deck";
    const allowSnapUp = onDeck || this.lastSource === "mesh";
    this.stableH = stabilizeHeight(
      this.stableH,
      target,
      onDeck,
      allowSnapUp,
      !onDeck
    );
    return this.stableH ?? fallbackTerrain;
  }

  /**
   * 프레임당 1회 호출 — probe + 안정화 후 SurfaceState 캐시.
   * frameId는 requestAnimationFrame 틱마다 증가하는 값을 넘기면 동일 프레임 중복 probe를 막는다.
   */
  updateFrameState(
    lng: number,
    lat: number,
    traveledM = 0,
    frameId?: number
  ): DrivingSurfaceState {
    const key = `${frameId ?? performance.now()}_${lng.toFixed(7)}_${lat.toFixed(7)}_${traveledM.toFixed(2)}`;
    if (this.frameState && this.frameStateKey === key) {
      return this.frameState;
    }

    this.runProbeUpdate(lng, lat, traveledM);
    const groundHeightM = this.stabilizeFromTarget(lng, lat);
    const state: DrivingSurfaceState = {
      lng,
      lat,
      groundHeightM,
      heightM: groundHeightM + SURFACE_CLEARANCE_M,
      source: this.lastSource,
      timestamp: performance.now(),
    };
    this.frameState = state;
    this.frameStateKey = key;
    return state;
  }

  getFrameState(): DrivingSurfaceState | null {
    return this.frameState;
  }

  /** 경로 정점용 — 안정화 없이 순차 probe (별도 baker 인스턴스 권장) */
  sampleRouteVertex(lng: number, lat: number, traveledM = 0): number {
    this.runProbeUpdate(lng, lat, traveledM, true);
    return this.targetH ?? readTerrainHeightAt(lng, lat);
  }

  smoothCameraGround(groundHeightM: number): number {
    if (this.cameraSmoothH == null) {
      this.cameraSmoothH = groundHeightM;
      return groundHeightM;
    }
    this.cameraSmoothH += (groundHeightM - this.cameraSmoothH) * 0.05;
    return this.cameraSmoothH;
  }

  sampleForVehicle(lng: number, lat: number, traveledM = 0): number {
    return this.updateFrameState(lng, lat, traveledM).heightM;
  }

  sampleForCamera(vehicleLng: number, vehicleLat: number, traveledM = 0): number {
    const state = this.getFrameState();
    const ground =
      state?.groundHeightM ??
      this.updateFrameState(vehicleLng, vehicleLat, traveledM).groundHeightM;
    return this.smoothCameraGround(ground);
  }

  getLastSource(): SurfaceSource {
    return this.lastSource;
  }

  getHintOffsetM(traveledM: number): number {
    return lookupElevatedOffsetM(traveledM, this.elevatedSegments);
  }

  getTargetH(): number | null {
    return this.targetH;
  }

  getStableH(): number | null {
    return this.stableH;
  }

  reset(): void {
    this.stableH = null;
    this.targetH = null;
    this.cameraSmoothH = null;
    this.lastProbeLng = Number.NaN;
    this.lastProbeLat = Number.NaN;
    this.lastSource = "terrain";
    this.mode = "terrain";
    this.elevatedSegments = [];
    this.lastHintOffsetM = 0;
    this.hintZoneEntryTerrainH = null;
    this.frameState = null;
    this.frameStateKey = "";
  }

  /** 경로 변경 시 — elevatedSegments는 유지하지 않고 호출측에서 다시 set */
  resetTracking(): void {
    this.stableH = null;
    this.targetH = null;
    this.cameraSmoothH = null;
    this.lastProbeLng = Number.NaN;
    this.lastProbeLat = Number.NaN;
    this.lastSource = "terrain";
    this.mode = "terrain";
    this.lastHintOffsetM = 0;
    this.hintZoneEntryTerrainH = null;
    this.frameState = null;
    this.frameStateKey = "";
  }
}

export const drivingSurfaceHeight = new DrivingSurfaceHeightTracker();

/** 경로 정점별 주행면 고도 — 차량과 동일 probe resolver, 별도 baker로 live tracker 오염 방지 */
export function buildRouteVertexHeights(
  coords: [number, number][],
  elevatedSegments: ElevatedSegment[],
  routeOffsetM = 0,
  options?: { maxSegmentM?: number; tessellate?: boolean }
): number[] {
  if (coords.length === 0) return [];

  const tessellate = options?.tessellate !== false;
  const maxSegmentM = options?.maxSegmentM ?? ROUTE_TESSELLATE_MAX_SEGMENT_M;
  const sampled = tessellate
    ? tessellateRouteCoords(coords, maxSegmentM)
    : coords;

  const baker = new DrivingSurfaceHeightTracker();
  baker.setElevatedSegments(elevatedSegments);
  const cumulative = buildCumulativeDistances(sampled);
  return sampled.map(([lng, lat], i) =>
    baker.sampleRouteVertex(lng, lat, routeOffsetM + cumulative[i])
  );
}

/** tessellation + 고도 — 3D 라인 좌표·높이 쌍 반환 */
export function buildRouteSurfacePath(
  coords: [number, number][],
  elevatedSegments: ElevatedSegment[],
  routeOffsetM = 0,
  options?: { maxSegmentM?: number }
): { coords: [number, number][]; heights: number[] } {
  const maxSegmentM = options?.maxSegmentM ?? ROUTE_TESSELLATE_MAX_SEGMENT_M;
  const tessellated = tessellateRouteCoords(coords, maxSegmentM);
  const heights = buildRouteVertexHeights(tessellated, elevatedSegments, routeOffsetM, {
    tessellate: false,
  });
  return { coords: tessellated, heights };
}

export function clearSurfaceProbeCache(): void {
  rawHeightCache.clear();
  drivingSurfaceHeight.reset();
}

export function resetDrivingSurfaceForRoute(): void {
  rawHeightCache.clear();
  drivingSurfaceHeight.resetTracking();
}
