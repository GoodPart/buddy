/**
 * 주행면 조사 — dev: window.__buddyInspectSurface(lng, lat)
 */

import { drivingSurfaceHeight, readTerrainHeightAt } from "./surface-probe";
import {
  drillPickHitsWithMetadata,
  hitIsVWorldDeckFeature,
  hitsContainBridgeMesh,
  type RayHitInfo,
} from "./ray-hit-inspect";
import { bridgeGisProvider } from "./bridge-gis-layer";

export type SurfaceInspectReport = {
  lng: number;
  lat: number;
  terrainH: number;
  hitCount: number;
  hasBridgeMeshFeature: boolean;
  bridgeMeshHits: RayHitInfo[];
  gisLookup: ReturnType<typeof bridgeGisProvider.lookup>;
  heights: number[];
  recommendation: string;
  /** Raycast API·타일 상태 진단 */
  diagnostics: {
    ws3dReady: boolean;
    drillPickAvailable: boolean;
    sampleHeightAvailable: boolean;
  };
};

function readProbeDiagnostics(): SurfaceInspectReport["diagnostics"] {
  const ws3d = (window as unknown as { ws3d?: { viewer?: { scene?: unknown } } }).ws3d;
  const scene = ws3d?.viewer?.scene as
    | { drillPickFromRay?: unknown; sampleHeight?: unknown }
    | undefined;
  return {
    ws3dReady: Boolean(ws3d?.viewer?.scene),
    drillPickAvailable: typeof scene?.drillPickFromRay === "function",
    sampleHeightAvailable: typeof scene?.sampleHeight === "function",
  };
}

let vehiclePositionProvider:
  | (() => { lng: number; lat: number; traveledM?: number } | null)
  | null = null;

/** VWorldCanvas — 현재 시뮬레이션 차량 좌표 */
export function registerVehiclePositionProvider(
  fn: () => { lng: number; lat: number; traveledM?: number } | null
): void {
  vehiclePositionProvider = fn;
}

function buildRecommendation(
  report: Omit<SurfaceInspectReport, "recommendation">
): string {
  if (report.bridgeMeshHits.length > 0 && report.hasBridgeMeshFeature) {
    return "① Raycast + 3D Tile Feature → Mesh Height";
  }
  if (report.heights.some((h) => h - report.terrainH >= 12)) {
    const tileDeck = report.bridgeMeshHits.length > 0;
    return tileDeck
      ? "① vWorld Tile Feature(du/map4) → Mesh Height"
      : "① Raycast → 덱 후보 (Feature 메타 확인 필요)";
  }
  if (report.gisLookup) {
    return "② GIS Polygon → deckAbsoluteM";
  }
  return "③ Terrain only (Mesh·GIS 없음 — Raycast만으로 상승 불가)";
}

export function inspectDrivingSurface(lng: number, lat: number): SurfaceInspectReport {
  const terrainH = readTerrainHeightAt(lng, lat);
  const hits = drillPickHitsWithMetadata(lng, lat, terrainH, 20);
  const bridgeMeshHits = hits.filter((h) => hitIsVWorldDeckFeature(h, terrainH));
  const gisLookup = bridgeGisProvider.lookup(lng, lat);
  const heights = [...new Set(hits.map((h) => Math.round(h.heightM * 10) / 10))].sort(
    (a, b) => a - b
  );

  const base = {
    lng,
    lat,
    terrainH,
    hitCount: hits.length,
    hasBridgeMeshFeature: hitsContainBridgeMesh(hits, terrainH),
    bridgeMeshHits,
    gisLookup,
    heights,
    diagnostics: readProbeDiagnostics(),
  };

  return { ...base, recommendation: buildRecommendation(base) };
}

export function logSurfaceInspectReport(lng: number, lat: number): SurfaceInspectReport {
  const report = inspectDrivingSurface(lng, lat);
  const allHits = drillPickHitsWithMetadata(lng, lat, report.terrainH, 20);

  console.group(`[buddy] surface @ ${lng.toFixed(6)}, ${lat.toFixed(6)}`);
  console.log("diagnostics:", report.diagnostics);
  console.log("terrainH:", report.terrainH);
  console.log("hitCount:", report.hitCount);
  console.log("heights:", report.heights);
  console.log("hasBridgeMeshFeature:", report.hasBridgeMeshFeature);
  console.log("gisLookup:", report.gisLookup);
  console.log("→", report.recommendation);
  if (report.hitCount === 0) {
    console.info(
      "hitCount=0 → 이 좌표에 3D 메시가 없거나, 예시 좌표(127.027,37.497)가 교량 위가 아닐 수 있습니다. 교량 위에서 __buddyInspectVehicle() 을 사용하세요."
    );
  }
  console.table(
    allHits.length
      ? allHits.map((h) => ({
          heightM: h.heightM,
          deltaM: Math.round((h.heightM - report.terrainH) * 10) / 10,
          primitiveName: h.primitiveName,
          tilesetUrl: h.tilesetUrl,
          isTileFeature: h.isTileFeature,
          propertyIds: h.propertyIds.join(", ") || "-",
          properties: JSON.stringify(h.properties),
          isDeckFeature: hitIsVWorldDeckFeature(h, report.terrainH),
        }))
      : [{ note: "no hits" }]
  );
  console.groupEnd();
  return report;
}

function inspectVehiclePosition(): SurfaceInspectReport | undefined {
  const pos = vehiclePositionProvider?.();
  if (!pos) {
    console.warn(
      "[buddy] 차량 위치 없음 — 경로 검색 후 시뮬레이션을 시작하거나 __buddyInspectSurface(lng, lat)을 사용하세요."
    );
    return undefined;
  }

  const traveledM = pos.traveledM ?? 0;
  const report = logSurfaceInspectReport(pos.lng, pos.lat);

  const vehicleAltitudeM =
    drivingSurfaceHeight.getFrameState()?.heightM ??
    drivingSurfaceHeight.updateFrameState(pos.lng, pos.lat, traveledM).heightM;
  const lastSource = drivingSurfaceHeight.getLastSource();
  const hintOffsetM = drivingSurfaceHeight.getHintOffsetM(traveledM);
  const targetH = drivingSurfaceHeight.getTargetH();
  const stableH = drivingSurfaceHeight.getStableH();

  console.group("[buddy] vehicle runtime");
  console.log("traveledM:", traveledM);
  console.log("hintOffsetM (교량 구간):", hintOffsetM);
  console.log("lastSource:", lastSource);
  console.log("targetH (지면):", targetH);
  console.log("stableH (지면):", stableH);
  console.log("vehicleAltitudeM:", vehicleAltitudeM);
  if (report.hasBridgeMeshFeature && hintOffsetM === 0 && lastSource !== "mesh") {
    console.warn(
      "Mesh는 감지되지만 lastSource≠mesh — probe 캐시 stale 가능. 잠시 주행 후 __buddyInspectVehicle() 재시도."
    );
  }
  if (lastSource === "mesh") {
    console.info("✓ vWorld Tile Feature mesh 고도 적용 중");
  } else if (hintOffsetM > 0 && lastSource === "hint-offset") {
    console.info("△ Tmap hint-offset 적용 중 (3D mesh 없음)");
  } else if (hintOffsetM > 0 && lastSource === "terrain") {
    console.info("△ hint 구간이지만 지형 bump 감지 → terrain만 사용");
  }
  console.groupEnd();

  return report;
}

export function installSurfaceProbeDebugTools(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    __buddyInspectSurface?: (lng: number, lat: number) => SurfaceInspectReport;
    __buddyInspectVehicle?: () => SurfaceInspectReport | undefined;
  };
  w.__buddyInspectSurface = logSurfaceInspectReport;
  w.__buddyInspectVehicle = inspectVehiclePosition;
}
