import { along, bbox, buffer, length, lineString } from "@turf/turf";
import type { RouteResponse } from "@/lib/tmap/types";
import { getRouteCoords } from "@/lib/tmap/route-line";

/** [west, south, east, north] */
export type BBox = [number, number, number, number];

function pointBBox(lng: number, lat: number, bufferKm: number): BBox {
  const latPad = bufferKm / 111;
  const lngPad = bufferKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lng - lngPad, lat - latPad, lng + lngPad, lat + latPad];
}

export function bboxAroundRoute(
  route: RouteResponse,
  bufferKm = 0.35
): BBox {
  const coords = getRouteCoords(route);
  if (coords.length >= 2) {
    const buffered = buffer(lineString(coords), bufferKm, {
      units: "kilometers",
      steps: 8,
    });
    if (buffered) {
      const [west, south, east, north] = bbox(buffered);
      return [west, south, east, north];
    }
  }

  const b = route.bounds;
  const midLat = (b.minLat + b.maxLat) / 2;
  const latPad = bufferKm / 111;
  const lngPad = bufferKm / (111 * Math.cos((midLat * Math.PI) / 180));
  return [
    b.minLng - lngPad,
    b.minLat - latPad,
    b.maxLng + lngPad,
    b.maxLat + latPad,
  ];
}

/** 경로를 따라 여러 작은 bbox — WFS MAXFEATURES 한계 회피 */
export function bboxesAlongRoute(
  route: RouteResponse,
  stepKm = 1,
  bufferKm = 0.3
): BBox[] {
  const coords = getRouteCoords(route);
  if (coords.length < 2) {
    return [bboxAroundRoute(route, bufferKm)];
  }

  const line = lineString(coords);
  const totalKm = length(line, { units: "kilometers" });
  if (totalKm <= 0) {
    return [bboxAroundRoute(route, bufferKm)];
  }

  const boxes: BBox[] = [];
  const seen = new Set<string>();

  const pushBox = (lng: number, lat: number) => {
    const box = pointBBox(lng, lat, bufferKm);
    const key = box.map((n) => n.toFixed(4)).join(",");
    if (seen.has(key)) return;
    seen.add(key);
    boxes.push(box);
  };

  pushBox(coords[0][0], coords[0][1]);

  for (let d = stepKm; d < totalKm; d += stepKm) {
    const point = along(line, d, { units: "kilometers" });
    pushBox(point.geometry.coordinates[0], point.geometry.coordinates[1]);
  }

  const last = coords[coords.length - 1];
  pushBox(last[0], last[1]);

  return boxes;
}
