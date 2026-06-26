import { along, bearing } from "@turf/turf";
import { buildRouteLine, getRouteCoords, getRouteLengthKm } from "./route-line";
import type { RoutePosition, RouteResponse } from "./types";

const BEARING_SAMPLE_KM = 0.01;

export type { RoutePosition };

export function interpolateAlongRoute(
  route: RouteResponse,
  progress: number
): RoutePosition {
  const p = Math.min(1, Math.max(0, progress));
  const coords = getRouteCoords(route);
  const totalKm = getRouteLengthKm(route);

  if (coords.length === 0) {
    return { lng: 0, lat: 0, bearing: 0 };
  }
  if (totalKm <= 0 || p <= 0) {
    const [lng, lat] = coords[0];
    return { lng, lat, bearing: 0 };
  }
  if (p >= 1) {
    const [lng, lat] = coords[coords.length - 1];
    const prevKm = Math.max(0, totalKm - BEARING_SAMPLE_KM);
    const line = buildRouteLine(route);
    const prevPt = along(line, prevKm, { units: "kilometers" });
    const endPt = along(line, totalKm, { units: "kilometers" });
    return { lng, lat, bearing: bearing(prevPt, endPt) };
  }

  const line = buildRouteLine(route);
  const distKm = p * totalKm;
  const pt = along(line, distKm, { units: "kilometers" });
  const [lng, lat] = pt.geometry.coordinates;

  const prevKm = Math.max(0, distKm - BEARING_SAMPLE_KM);
  const prevPt = along(line, prevKm, { units: "kilometers" });
  const hdg = bearing(prevPt, pt);

  return { lng, lat, bearing: Number.isFinite(hdg) ? hdg : 0 };
}
