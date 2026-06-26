import type { VWorldGeoJson } from "./client";

export type VWorldBuildingFootprint = {
  id: string;
  rings: [number, number][][];
  heightM: number;
  floors: number;
};

const DEFAULT_HEIGHT_M = 10;
const FLOOR_HEIGHT_M = 3.5;
const MAX_HEIGHT_M = 150;

function estimateFloors(props: GeoJSON.GeoJsonProperties): number {
  if (!props) return Math.ceil(DEFAULT_HEIGHT_M / FLOOR_HEIGHT_M);

  const floors = Number(props.gro_flo_co ?? props.grnd_flr ?? props.gro_flo);
  if (Number.isFinite(floors) && floors > 0) return floors;

  return Math.ceil(DEFAULT_HEIGHT_M / FLOOR_HEIGHT_M);
}

function estimateHeight(props: GeoJSON.GeoJsonProperties): number {
  if (!props) return DEFAULT_HEIGHT_M;

  const numericKeys = ["buld_hgt", "buld_ht", "height", "hgt"];
  for (const key of numericKeys) {
    const value = Number(props[key]);
    if (Number.isFinite(value) && value > 0) {
      return Math.min(value, MAX_HEIGHT_M);
    }
  }

  const floors = Number(props.gro_flo_co ?? props.grnd_flr ?? props.gro_flo);
  if (Number.isFinite(floors) && floors > 0) {
    return Math.min(floors * FLOOR_HEIGHT_M, MAX_HEIGHT_M);
  }

  return DEFAULT_HEIGHT_M;
}

function pushPolygonRings(
  coordinates: GeoJSON.Polygon["coordinates"],
  out: VWorldBuildingFootprint[],
  id: string,
  heightM: number,
  floors: number
) {
  if (!coordinates.length) return;
  const rings = coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lng, lat] as [number, number])
  );
  out.push({ id, rings, heightM, floors });
}

function pushFromGeometry(
  geometry: GeoJSON.Geometry,
  out: VWorldBuildingFootprint[],
  id: string,
  heightM: number,
  floors: number
) {
  if (geometry.type === "Polygon") {
    pushPolygonRings(geometry.coordinates, out, id, heightM, floors);
    return;
  }
  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon, index) => {
      pushPolygonRings(polygon, out, `${id}-${index}`, heightM, floors);
    });
  }
}

export function parseSpbdGeoJson(geojson: VWorldGeoJson): VWorldBuildingFootprint[] {
  const buildings: VWorldBuildingFootprint[] = [];

  for (const [index, feature] of geojson.features.entries()) {
    if (!feature.geometry) continue;
    const props = feature.properties ?? {};
    const id = String(props.bd_mgt_sn ?? props.ufid ?? feature.id ?? `spbd-${index}`);
    const floors = estimateFloors(props);
    const heightM = estimateHeight(props);
    pushFromGeometry(feature.geometry, buildings, id, heightM, floors);
  }

  return buildings;
}
