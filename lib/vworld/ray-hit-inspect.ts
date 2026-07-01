/**
 * drillPickFromRay hit 메타데이터 추출 — Bridge Mesh / 3D Tile Feature 조사용
 */

type Cartesian3 = { x: number; y: number; z: number };

type PickObjectLike = {
  primitive?: { constructor?: { name?: string } };
  tileset?: { url?: string; _url?: string };
  content?: { tileset?: { url?: string; _url?: string } };
  getProperty?: (id: string) => unknown;
  getPropertyIds?: () => string[];
};

export type RayHitInfo = {
  heightM: number;
  primitiveName: string | null;
  tilesetUrl: string | null;
  isTileFeature: boolean;
  propertyIds: string[];
  properties: Record<string, unknown>;
};

type Ws3dRayRuntime = {
  viewer?: {
    scene?: {
      drillPickFromRay?: (
        ray: unknown,
        limit?: number
      ) => Array<{ position?: Cartesian3; object?: PickObjectLike }>;
    };
  };
  common?: {
    Cartesian3: {
      fromDegrees: (lng: number, lat: number, alt?: number) => Cartesian3;
      subtract: (left: Cartesian3, right: Cartesian3, result: Cartesian3) => Cartesian3;
      normalize: (cartesian: Cartesian3, result: Cartesian3) => Cartesian3;
    };
    Cartographic?: {
      fromCartesian: (cartesian: Cartesian3) => {
        height: number;
      };
    };
    Ray?: new (origin: Cartesian3, direction: Cartesian3) => unknown;
  };
};

const BRIDGE_PROPERTY_KEYS =
  /bridge|교량|viaduct|overpass|deck|고가|육교|대교|철교|facility|kind|class|type|name/i;

/** vWorld 3D Tiles — 교량·도로 구조물 타일 URL 패턴 */
const VWORLD_STRUCTURE_TILE = /TDServer\/services\/map/i;

export const DECK_MIN_ABOVE_TERRAIN_M = 12;
export const DECK_MIN_ABOVE_TERRAIN_RELAXED_M = 4;
export const DECK_MAX_ABOVE_TERRAIN_M = 55;

function getWs3d(): Ws3dRayRuntime | null {
  return (window as unknown as { ws3d?: Ws3dRayRuntime }).ws3d ?? null;
}

function readTilesetUrl(obj: PickObjectLike | undefined): string | null {
  if (!obj) return null;
  return (
    obj.tileset?.url ??
    obj.tileset?._url ??
    obj.content?.tileset?.url ??
    obj.content?.tileset?._url ??
    null
  );
}

function extractFeatureProperties(
  obj: PickObjectLike | undefined
): { ids: string[]; props: Record<string, unknown> } {
  if (!obj?.getPropertyIds || !obj.getProperty) {
    return { ids: [], props: {} };
  }

  try {
    const ids = obj.getPropertyIds() ?? [];
    const props: Record<string, unknown> = {};
    for (const id of ids) {
      try {
        props[id] = obj.getProperty(id);
      } catch {
        /* ignore */
      }
    }
    return { ids, props };
  } catch {
    return { ids: [], props: {} };
  }
}

function summarizeHit(
  hit: { position?: Cartesian3; object?: PickObjectLike },
  Cartographic: NonNullable<Ws3dRayRuntime["common"]>["Cartographic"]
): RayHitInfo | null {
  if (!hit.position || !Cartographic) return null;

  const carto = Cartographic.fromCartesian(hit.position);
  if (!Number.isFinite(carto.height)) return null;

  const obj = hit.object;
  const { ids, props } = extractFeatureProperties(obj);

  return {
    heightM: carto.height,
    primitiveName: obj?.primitive?.constructor?.name ?? null,
    tilesetUrl: readTilesetUrl(obj),
    isTileFeature: ids.length > 0 || typeof obj?.getProperty === "function",
    propertyIds: ids,
    properties: props,
  };
}

/** 수직 Ray — hit 목록 + 3D Tile Feature 메타데이터 */
export function drillPickHitsWithMetadata(
  lng: number,
  lat: number,
  terrainH: number,
  limit = 20
): RayHitInfo[] {
  const ws3d = getWs3d();
  const C = ws3d?.common;
  const scene = ws3d?.viewer?.scene;
  if (!C?.Cartesian3 || !C.Cartographic || !C.Ray || !scene?.drillPickFromRay) {
    return [];
  }

  try {
    const top = C.Cartesian3.fromDegrees(lng, lat, terrainH + 120);
    const bottom = C.Cartesian3.fromDegrees(lng, lat, terrainH - 3);
    const dir = C.Cartesian3.fromDegrees(0, 0, 0);
    C.Cartesian3.subtract(bottom, top, dir);
    C.Cartesian3.normalize(dir, dir);
    const ray = new C.Ray(top, dir);
    const rawHits = scene.drillPickFromRay(ray, limit) ?? [];

    const hits: RayHitInfo[] = [];
    for (const hit of rawHits) {
      const info = summarizeHit(hit, C.Cartographic);
      if (info) hits.push(info);
    }
    return hits;
  } catch {
    return [];
  }
}

/** Feature property / URL / primitive 이름으로 교량 메시 후보 판별 */
export function hitLooksLikeBridgeMesh(hit: RayHitInfo): boolean {
  for (const [key, value] of Object.entries(hit.properties)) {
    if (!BRIDGE_PROPERTY_KEYS.test(key)) continue;
    const text = String(value ?? "").toLowerCase();
    if (BRIDGE_PROPERTY_KEYS.test(text)) return true;
  }

  for (const value of Object.values(hit.properties)) {
    const text = String(value ?? "").toLowerCase();
    if (/bridge|교량|viaduct|overpass|고가|육교|대교/.test(text)) return true;
  }

  const primitive = (hit.primitiveName ?? "").toLowerCase();
  if (/bridge|viaduct|overpass/.test(primitive)) return true;

  const url = (hit.tilesetUrl ?? "").toLowerCase();
  if (/bridge|교량|viaduct|overpass|road3d|transport/.test(url)) return true;

  return false;
}

/** vWorld 3D Tile Feature + 덱 높이 — 실측: primitive `du`, tileset `map4/*.json` */
export function hitIsVWorldDeckFeature(
  hit: RayHitInfo,
  terrainH: number,
  minAboveTerrainM = DECK_MIN_ABOVE_TERRAIN_M
): boolean {
  const delta = hit.heightM - terrainH;
  if (delta < minAboveTerrainM || delta > DECK_MAX_ABOVE_TERRAIN_M) {
    return false;
  }

  if (hit.isTileFeature && hit.propertyIds.length > 0) {
    if (hit.primitiveName === "du") return true;
    if (hit.tilesetUrl && VWORLD_STRUCTURE_TILE.test(hit.tilesetUrl)) return true;
  }

  return hitLooksLikeBridgeMesh(hit);
}

export function hitsContainBridgeMesh(
  hits: RayHitInfo[],
  terrainH: number
): boolean {
  return hits.some((h) => hitIsVWorldDeckFeature(h, terrainH));
}

/** @deprecated hitIsVWorldDeckFeature 사용 */
export function hitsContainBridgeMeshLegacy(hits: RayHitInfo[]): boolean {
  return hits.some(hitLooksLikeBridgeMesh);
}
