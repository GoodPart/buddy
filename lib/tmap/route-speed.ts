import type { RouteLinkSegment, RouteResponse, TrafficCongestionLevel } from "./types";
import { getRoutePathDistanceM } from "./guidance";

export function getAverageSpeedKmh(route: RouteResponse): number {
  if (route.averageSpeedKmh > 0) return route.averageSpeedKmh;
  if (route.totalTime <= 0) return 0;
  return (getRoutePathDistanceM(route) / route.totalTime) * 3.6;
}

export function resolveLinkSegmentAt(
  route: RouteResponse,
  traveledM: number
): RouteLinkSegment | null {
  const { linkSegments } = route;
  if (!linkSegments.length) return null;

  const clamped = Math.min(
    Math.max(0, traveledM),
    getRoutePathDistanceM(route)
  );

  for (const seg of linkSegments) {
    if (clamped >= seg.distanceStartM && clamped < seg.distanceEndM) {
      return seg;
    }
  }

  return linkSegments[linkSegments.length - 1] ?? null;
}

/** 시뮬레이션 기준 현재 주행 속도 (km/h) */
export function getSimSpeedKmh(
  route: RouteResponse,
  traveledM: number,
  speedMultiplier: number,
  status: string,
  atSignalStop = false
): number {
  if (status !== "running" || atSignalStop) return 0;

  const seg = resolveLinkSegmentAt(route, traveledM);
  const baseKmh = seg?.speedKmh ?? getAverageSpeedKmh(route);
  return Math.round(baseKmh * speedMultiplier);
}

/** Tmap 구간 예상 통행 속도 (km/h) — 배율 미적용 */
export function getSegmentSpeedKmh(
  route: RouteResponse,
  traveledM: number
): number | null {
  const seg = resolveLinkSegmentAt(route, traveledM);
  return seg ? Math.round(seg.speedKmh) : null;
}

/** 현재 링크 구간 혼잡도 */
export function getSegmentCongestion(
  route: RouteResponse,
  traveledM: number
): TrafficCongestionLevel | null {
  const seg = resolveLinkSegmentAt(route, traveledM);
  return seg?.congestionLevel ?? null;
}

/** 구간별 속도로 주행 거리 진행 */
export function advanceTraveledM(
  route: RouteResponse,
  traveledM: number,
  deltaMs: number,
  speedMultiplier: number
): number {
  const pathDistM = getRoutePathDistanceM(route);
  if (pathDistM <= 0 || deltaMs <= 0) return traveledM;

  let current = Math.min(traveledM, pathDistM);
  let timeLeftSec = (deltaMs / 1000) * speedMultiplier;

  if (!route.linkSegments.length) {
    const speedMps = pathDistM / route.totalTime;
    return Math.min(pathDistM, current + speedMps * timeLeftSec);
  }

  while (timeLeftSec > 0 && current < pathDistM) {
    const seg = resolveLinkSegmentAt(route, current);
    const speedMps = ((seg?.speedKmh ?? getAverageSpeedKmh(route)) || 1) / 3.6;
    const segEnd = seg?.distanceEndM ?? pathDistM;
    const distLeftInSeg = Math.max(0, segEnd - current);
    const distCanTravel = speedMps * timeLeftSec;

    if (distCanTravel <= distLeftInSeg || distLeftInSeg === 0) {
      current = Math.min(pathDistM, current + distCanTravel);
      break;
    }

    current = segEnd;
    timeLeftSec -= distLeftInSeg / speedMps;
  }

  return Math.min(pathDistM, current);
}
