import { length, lineString } from "@turf/turf";
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
