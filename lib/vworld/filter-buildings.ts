import { booleanPointInPolygon, buffer, lineString, point } from "@turf/turf";
import type { RouteResponse } from "@/lib/tmap/types";
import { getRouteCoords } from "@/lib/tmap/route-line";
import type { VWorldBuildingFootprint } from "./parse-buildings";

/** 차선 중심 기준 포장 구간 반폭(m) — 이 안에 중심이 있으면 도로 위로 간주 */
const PAVED_HALF_WIDTH_M = 10;

function ringCentroid(ring: [number, number][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

/** Tmap 경로 포장부와 겹치는 VWorld footprint 제거 */
export function filterBuildingsOffPavedRoute(
  buildings: VWorldBuildingFootprint[],
  route: RouteResponse
): VWorldBuildingFootprint[] {
  const coords = getRouteCoords(route);
  if (coords.length < 2) return buildings;

  const paved = buffer(lineString(coords), PAVED_HALF_WIDTH_M / 1000, {
    units: "kilometers",
    steps: 4,
  });
  if (!paved) return buildings;

  return buildings.filter((building) => {
    const outer = building.rings[0];
    if (!outer || outer.length < 3) return false;

    const [lng, lat] = ringCentroid(outer);
    return !booleanPointInPolygon(point([lng, lat]), paved);
  });
}
