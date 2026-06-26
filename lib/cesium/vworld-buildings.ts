import type { BBox } from "@/lib/vworld/bbox";
import { bboxesAlongRoute } from "@/lib/vworld/bbox";
import type { RouteResponse } from "@/lib/tmap/types";
import { buildingColorCss } from "@/lib/vworld/building-style";
import { filterBuildingsOffPavedRoute } from "@/lib/vworld/filter-buildings";
import type { VWorldBuildingFootprint } from "@/lib/vworld/parse-buildings";

type CesiumModule = typeof import("cesium");
type Viewer = import("cesium").Viewer;
type Primitive = import("cesium").Primitive;

export const VWORLD_BUILDING_PREFIX = "vworld-bldg-";

const VWORLD_PRIMITIVE_FLAG = "__vworldBuildings";
const MAX_TOTAL_BUILDINGS = 1200;
const FETCH_CONCURRENCY = 4;

function flatRing(ring: [number, number][]): number[] {
  const out: number[] = [];
  for (const [lng, lat] of ring) {
    out.push(lng, lat);
  }
  return out;
}

function ringCentroid(ring: [number, number][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

function markVWorldPrimitive(primitive: Primitive) {
  (primitive as Primitive & { [VWORLD_PRIMITIVE_FLAG]?: boolean })[
    VWORLD_PRIMITIVE_FLAG
  ] = true;
}

function isVWorldPrimitive(primitive: unknown): primitive is Primitive {
  return Boolean(
    primitive &&
      typeof primitive === "object" &&
      (primitive as { [VWORLD_PRIMITIVE_FLAG]?: boolean })[VWORLD_PRIMITIVE_FLAG]
  );
}

async function waitForTerrain(viewer: Viewer, timeoutMs = 5000): Promise<void> {
  if (viewer.scene.globe.tilesLoaded) return;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      removeListener();
      clearTimeout(timer);
      resolve();
    };

    const removeListener = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
      (queueLength) => {
        if (queueLength === 0) finish();
      }
    );
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

async function sampleTerrainHeights(
  Cesium: CesiumModule,
  viewer: Viewer,
  buildings: VWorldBuildingFootprint[]
): Promise<number[]> {
  if (buildings.length === 0) return [];

  const cartographics = buildings.map((building) => {
    const [lng, lat] = ringCentroid(building.rings[0]!);
    return Cesium.Cartographic.fromDegrees(lng, lat);
  });

  try {
    const sampled = await Cesium.sampleTerrainMostDetailed(
      viewer.terrainProvider,
      cartographics
    );
    return sampled.map((carto) =>
      Number.isFinite(carto.height) ? carto.height : 0
    );
  } catch {
    return buildings.map(() => 0);
  }
}

export async function fetchVWorldBuildings(
  bbox: BBox
): Promise<VWorldBuildingFootprint[]> {
  const res = await fetch(
    `/api/vworld/buildings?bbox=${bbox.map((n) => n.toFixed(6)).join(",")}`
  );
  const data = (await res.json()) as {
    buildings?: VWorldBuildingFootprint[];
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `VWorld buildings HTTP ${res.status}`);
  }

  return data.buildings ?? [];
}

function mergeBuildings(
  batches: VWorldBuildingFootprint[][]
): VWorldBuildingFootprint[] {
  const seen = new Set<string>();
  const merged: VWorldBuildingFootprint[] = [];

  for (const buildings of batches) {
    for (const building of buildings) {
      if (seen.has(building.id)) continue;
      seen.add(building.id);
      merged.push(building);
      if (merged.length >= MAX_TOTAL_BUILDINGS) return merged;
    }
  }

  return merged;
}

export async function fetchVWorldBuildingsAlongRoute(
  route: RouteResponse
): Promise<VWorldBuildingFootprint[]> {
  const boxes = bboxesAlongRoute(route);
  const batches: VWorldBuildingFootprint[][] = [];

  for (let i = 0; i < boxes.length; i += FETCH_CONCURRENCY) {
    const chunk = boxes.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((box) =>
        fetchVWorldBuildings(box).catch(() => [] as VWorldBuildingFootprint[])
      )
    );
    batches.push(...results);

    const soFar = mergeBuildings(batches);
    if (soFar.length >= MAX_TOTAL_BUILDINGS) {
      return soFar;
    }
  }

  return mergeBuildings(batches);
}

export function clearVWorldBuildings(viewer: Viewer) {
  const toRemove = viewer.entities.values.filter((entity) =>
    String(entity.id ?? "").startsWith(VWORLD_BUILDING_PREFIX)
  );
  for (const entity of toRemove) {
    viewer.entities.remove(entity);
  }

  const primitives = viewer.scene.primitives;
  for (let i = primitives.length - 1; i >= 0; i--) {
    const primitive = primitives.get(i);
    if (isVWorldPrimitive(primitive)) {
      primitives.remove(primitive);
    }
  }
}

export function setVWorldBuildingsVisible(viewer: Viewer, visible: boolean) {
  for (const entity of viewer.entities.values) {
    if (String(entity.id ?? "").startsWith(VWORLD_BUILDING_PREFIX)) {
      entity.show = visible;
    }
  }

  const primitives = viewer.scene.primitives;
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives.get(i);
    if (isVWorldPrimitive(primitive)) {
      primitive.show = visible;
    }
  }
}

export async function renderVWorldBuildings(
  Cesium: CesiumModule,
  viewer: Viewer,
  buildings: VWorldBuildingFootprint[]
): Promise<number> {
  clearVWorldBuildings(viewer);
  if (buildings.length === 0) return 0;

  const terrainHeights = await sampleTerrainHeights(Cesium, viewer, buildings);
  const instances: import("cesium").GeometryInstance[] = [];

  for (const [index, building] of buildings.entries()) {
    const outer = building.rings[0];
    if (!outer || outer.length < 3) continue;

    const terrainH = terrainHeights[index] ?? 0;
    const topH = terrainH + building.heightM;

    instances.push(
      new Cesium.GeometryInstance({
        id: `${VWORLD_BUILDING_PREFIX}${building.id}-${index}`,
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(flatRing(outer))
          ),
          height: terrainH,
          extrudedHeight: topH,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(buildingColorCss(building))
          ),
        },
      })
    );
  }

  if (instances.length === 0) return 0;

  const primitive = new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      flat: true,
      translucent: false,
    }),
    asynchronous: false,
  });
  markVWorldPrimitive(primitive);
  viewer.scene.primitives.add(primitive);

  return instances.length;
}

export async function loadVWorldBuildingsForRoute(
  Cesium: CesiumModule,
  viewer: Viewer,
  route: RouteResponse
): Promise<number> {
  const raw = await fetchVWorldBuildingsAlongRoute(route);
  const buildings = filterBuildingsOffPavedRoute(raw, route);
  if (buildings.length === 0) return 0;

  await waitForTerrain(viewer);
  const count = await renderVWorldBuildings(Cesium, viewer, buildings);
  viewer.scene.requestRender();
  return count;
}

export async function loadVWorldBuildingsForBbox(
  Cesium: CesiumModule,
  viewer: Viewer,
  bbox: BBox
): Promise<number> {
  const buildings = await fetchVWorldBuildings(bbox);
  if (buildings.length === 0) return 0;

  await waitForTerrain(viewer);
  const count = await renderVWorldBuildings(Cesium, viewer, buildings);
  viewer.scene.requestRender();
  return count;
}
