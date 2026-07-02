import { along, length, lineString } from "@turf/turf";
import type { RouteResponse } from "./types";

export function getRouteCoords(route: RouteResponse): [number, number][] {
  return route.pathCoordinates.length > 0
    ? route.pathCoordinates
    : route.coordinates;
}

export function buildRouteLine(route: RouteResponse) {
  return lineString(getRouteCoords(route));
}

export function getRouteLengthKm(route: RouteResponse): number {
  const coords = getRouteCoords(route);
  if (coords.length < 2) return 0;
  return length(buildRouteLine(route), { units: "kilometers" });
}

/** 50m 초과 구간에 중간 정점 삽입 — probe·라인 고도 샘플 밀도 확보 */
export const ROUTE_TESSELLATE_MAX_SEGMENT_M = 50;
/** 3D 경로 probe용 — tessellation 간격 (클수록 raycast 적음) */
export const ROUTE_PROBE_TESSELLATE_MAX_M = 80;

/**
 * 경로 polyline tessellation — Turf `along`으로 polyline을 따라 샘플링.
 * lat/lng 직선 보간은 코너·건물 구역을 가로지를 수 있음.
 */
export function tessellateRouteCoords(
  coords: [number, number][],
  maxSegmentM = ROUTE_TESSELLATE_MAX_SEGMENT_M
): [number, number][] {
  if (coords.length < 2 || maxSegmentM <= 0) return coords;

  const line = lineString(coords);
  const totalM = length(line, { units: "meters" });
  if (totalM <= maxSegmentM) return coords;

  const out: [number, number][] = [];
  for (let d = 0; d < totalM; d += maxSegmentM) {
    const pt = along(line, d / 1000, { units: "kilometers" });
    out.push(pt.geometry.coordinates as [number, number]);
  }

  const last = coords[coords.length - 1];
  const tail = out[out.length - 1];
  if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) {
    out.push(last);
  }
  out[0] = coords[0];
  return out;
}
