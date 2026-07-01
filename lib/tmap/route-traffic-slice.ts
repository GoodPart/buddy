import type { RouteLinkSegment, RouteResponse } from "./types";
import { along, length, lineSlice, lineString, point } from "@turf/turf";
import { getRouteCoords } from "./route-line";

/** 링크 구간에 해당하는 경로 좌표 — 거리(m) 기준 슬라이스 (인덱스 비율 사용 시 도로 이탈) */
export function sliceCoordsForLinkSegment(
  route: RouteResponse,
  segment: RouteLinkSegment
): [number, number][] {
  const coords = getRouteCoords(route);
  if (coords.length < 2) return coords;

  const line = lineString(coords);
  const totalM =
    route.pathDistance > 0
      ? route.pathDistance
      : length(line, { units: "meters" });
  if (totalM <= 0) return coords;

  const startM = Math.max(0, segment.distanceStartM);
  const endM = Math.min(totalM, segment.distanceEndM);
  if (endM - startM < 0.5) return coords.slice(0, 2);
  if (startM <= 0.5 && endM >= totalM - 0.5) return coords;

  const startPt = along(line, startM / 1000, { units: "kilometers" });
  const endPt = along(line, endM / 1000, { units: "kilometers" });

  try {
    const sliced = lineSlice(
      point(startPt.geometry.coordinates),
      point(endPt.geometry.coordinates),
      line
    );
    const out = sliced.geometry.coordinates as [number, number][];
    if (out.length >= 2) return out;
  } catch {
    /* fallback below */
  }

  return [
    startPt.geometry.coordinates as [number, number],
    endPt.geometry.coordinates as [number, number],
  ];
}
