import { buildCumulativeDistances } from "./geo";
import type { RouteResponse } from "./types";

export function interpolateAlongRoute(
  route: RouteResponse,
  progress: number
): { lng: number; lat: number } {
  const p = Math.min(1, Math.max(0, progress));
  const coordinates = route.pathCoordinates.length
    ? route.pathCoordinates
    : route.coordinates;
  const pathDistance =
    route.pathDistance > 0 ? route.pathDistance : route.totalDistance;

  if (coordinates.length === 0) return { lng: 0, lat: 0 };
  if (p <= 0) return { lng: coordinates[0][0], lat: coordinates[0][1] };
  if (p >= 1) {
    const last = coordinates[coordinates.length - 1];
    return { lng: last[0], lat: last[1] };
  }

  const cumulative = buildCumulativeDistances(coordinates);
  const targetDist = p * pathDistance;

  let i = 1;
  while (i < cumulative.length && cumulative[i] < targetDist) i++;

  const segStart = cumulative[i - 1];
  const segEnd = cumulative[i] ?? segStart;
  const segLen = segEnd - segStart || 1;
  const t = (targetDist - segStart) / segLen;

  const [lng1, lat1] = coordinates[i - 1];
  const [lng2, lat2] = coordinates[i] ?? coordinates[i - 1];

  return {
    lng: lng1 + (lng2 - lng1) * t,
    lat: lat1 + (lat2 - lat1) * t,
  };
}
