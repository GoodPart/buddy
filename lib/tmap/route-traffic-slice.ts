import type { RouteLinkSegment, RouteResponse } from "./types";
import { getRouteCoords } from "./route-line";

/** 링크 구간에 해당하는 경로 좌표 슬라이스 */
export function sliceCoordsForLinkSegment(
  route: RouteResponse,
  segment: RouteLinkSegment
): [number, number][] {
  const coords = getRouteCoords(route);
  if (coords.length < 2) return coords;

  const total = route.pathDistance > 0 ? route.pathDistance : route.totalDistance;
  if (total <= 0) return coords;

  const startRatio = segment.distanceStartM / total;
  const endRatio = segment.distanceEndM / total;

  let startIdx = Math.floor(startRatio * (coords.length - 1));
  let endIdx = Math.ceil(endRatio * (coords.length - 1));

  startIdx = Math.max(0, Math.min(coords.length - 1, startIdx));
  endIdx = Math.max(startIdx + 1, Math.min(coords.length - 1, endIdx));

  const slice = coords.slice(startIdx, endIdx + 1);
  return slice.length >= 2 ? slice : coords.slice(0, 2);
}
