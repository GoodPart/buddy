import { length, lineString } from "@turf/turf";
import type { RouteResponse } from "./types";
import { haversineMeters } from "./geo";

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

/**
 * 경로 polyline tessellation.
 * maxSegmentM보다 긴 구간을 등간격으로 쪼갠다 (차량 1m 보간과 probe 정렬).
 */
export function tessellateRouteCoords(
  coords: [number, number][],
  maxSegmentM = ROUTE_TESSELLATE_MAX_SEGMENT_M
): [number, number][] {
  if (coords.length < 2 || maxSegmentM <= 0) return coords;

  const out: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const segM = haversineMeters(prev, cur);
    if (segM <= maxSegmentM) {
      out.push(cur);
      continue;
    }

    const steps = Math.ceil(segM / maxSegmentM);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([
        prev[0] + (cur[0] - prev[0]) * t,
        prev[1] + (cur[1] - prev[1]) * t,
      ]);
    }
  }
  return out;
}
