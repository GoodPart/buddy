import { haversineMeters, buildCumulativeDistances } from "./geo";
import { formatTurnType } from "./guidance";
import { buildPathCoordinates, computePathDistance } from "./route-path";
import { parseTrafficCongestion } from "./traffic-congestion";
import type { RouteGuidance, RouteLinkSegment, RouteResponse } from "./types";

type FeatureProps = {
  pointType?: string;
  pointIndex?: number;
  index?: number;
  lineIndex?: number;
  turnType?: number;
  name?: string;
  description?: string;
  nextRoadName?: string;
  totalDistance?: number;
  totalTime?: number;
  totalFare?: number;
  taxiFare?: number;
  distance?: number;
  time?: number;
  speed?: number;
  congestion?: number;
  traffic?: string | number[];
};

type TmapRouteJson = {
  features?: Array<{
    geometry?: {
      type?: string;
      coordinates?: number[] | number[][];
    };
    properties?: FeatureProps;
  }>;
  properties?: FeatureProps;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function extractRouteMeta(data: TmapRouteJson) {
  const fromRoot = data.properties ?? {};
  let totalDistance = toNum(fromRoot.totalDistance);
  let totalTime = toNum(fromRoot.totalTime);
  let totalFare = toNum(fromRoot.totalFare);
  let taxiFare = toNum(fromRoot.taxiFare);

  for (const f of data.features ?? []) {
    const p = f.properties;
    if (!p) continue;
    const pt = p.pointType;
    if (pt !== "S" && pt !== "SP" && pt !== "E") continue;

    totalDistance ??= toNum(p.totalDistance);
    totalTime ??= toNum(p.totalTime);
    totalFare ??= toNum(p.totalFare);
    taxiFare ??= toNum(p.taxiFare);
    if (totalDistance != null && totalTime != null) break;
  }

  return { totalDistance, totalTime, totalFare, taxiFare };
}

function estimateTimeSec(distanceM: number) {
  const avgSpeedMps = 30000 / 3600;
  return Math.max(60, Math.round(distanceM / avgSpeedMps));
}

/** Point 좌표를 경로 polyline에 투영해 누적 거리(m) 계산 */
function distanceAlongRoute(
  coordinates: [number, number][],
  lng: number,
  lat: number
): number {
  if (coordinates.length === 0) return 0;

  const cumulative = buildCumulativeDistances(coordinates);
  const target: [number, number] = [lng, lat];

  let bestDist = 0;
  let bestOffset = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineMeters(coordinates[i], target);
    if (d < bestOffset) {
      bestOffset = d;
      bestDist = cumulative[i];
    }
  }

  return Math.round(bestDist);
}

function parseGuidances(
  data: TmapRouteJson,
  coordinates: [number, number][]
): RouteGuidance[] {
  const raw: RouteGuidance[] = [];

  for (const f of data.features ?? []) {
    if (f.geometry?.type !== "Point") continue;
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    if (Array.isArray(coords[0])) continue;

    const [lng, lat] = coords as number[];
    const p = f.properties ?? {};
    const pointType = p.pointType ?? "";
    const turnType = toNum(p.turnType);
    const description = p.description?.trim();
    if (!description) continue;

    raw.push({
      index: toNum(p.index) ?? raw.length + 1,
      pointIndex: toNum(p.pointIndex),
      pointType,
      turnType,
      turnLabel: formatTurnType(turnType),
      name: p.name?.trim() || undefined,
      description,
      nextRoadName: p.nextRoadName?.trim() || undefined,
      lng,
      lat,
      distanceAlongRoute: 0,
    });
  }

  raw.sort((a, b) => a.index - b.index);

  for (const g of raw) {
    g.distanceAlongRoute = distanceAlongRoute(coordinates, g.lng, g.lat);
  }

  return raw;
}

function lineStringLengthM(coords: number[][]): number {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineMeters(
      [coords[i - 1][0], coords[i - 1][1]],
      [coords[i][0], coords[i][1]]
    );
  }
  return sum;
}

function parseLinkSegments(
  data: TmapRouteJson,
  pathDistanceM: number
): RouteLinkSegment[] {
  const lineFeatures = (data.features ?? [])
    .filter((f) => f.geometry?.type === "LineString")
    .sort((a, b) => {
      const ai = toNum(a.properties?.index) ?? toNum(a.properties?.lineIndex) ?? 0;
      const bi = toNum(b.properties?.index) ?? toNum(b.properties?.lineIndex) ?? 0;
      return ai - bi;
    });

  const raw: RouteLinkSegment[] = [];
  let cumulative = 0;

  for (const f of lineFeatures) {
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || !coords.length) continue;
    const lineCoords = Array.isArray(coords[0])
      ? (coords as number[][])
      : [coords as number[]];

    const p = f.properties ?? {};
    let distanceM = toNum(p.distance) ?? Math.round(lineStringLengthM(lineCoords));
    if (distanceM <= 0) continue;

    const timeSec = toNum(p.time);
    let speedKmh = toNum(p.speed);
    if ((!speedKmh || speedKmh <= 0) && timeSec && timeSec > 0) {
      speedKmh = (distanceM / timeSec) * 3.6;
    }
    if (!speedKmh || speedKmh <= 0) {
      speedKmh = 40;
    }

    const segTime =
      timeSec && timeSec > 0 ? timeSec : distanceM / (speedKmh / 3.6);

    const congestionLevel = parseTrafficCongestion(
      p.traffic ?? p.congestion,
      speedKmh
    );

    raw.push({
      distanceM,
      timeSec: segTime,
      speedKmh,
      congestionLevel,
      distanceStartM: cumulative,
      distanceEndM: cumulative + distanceM,
    });
    cumulative += distanceM;
  }

  if (!raw.length || pathDistanceM <= 0) return raw;

  const linkTotal = raw[raw.length - 1].distanceEndM;
  if (linkTotal <= 0) return raw;

  const scale = pathDistanceM / linkTotal;
  if (Math.abs(scale - 1) < 0.02) return raw;

  return raw.map((seg) => ({
    ...seg,
    distanceStartM: seg.distanceStartM * scale,
    distanceEndM: seg.distanceEndM * scale,
    distanceM: seg.distanceM * scale,
  }));
}

export function parseTmapRoute(data: TmapRouteJson): RouteResponse {
  const coordinates: [number, number][] = [];

  for (const f of data.features ?? []) {
    const coords = f.geometry?.coordinates;
    if (!coords?.length) continue;
    if (f.geometry?.type === "Point") continue;
    const list = Array.isArray(coords[0]) ? (coords as number[][]) : [coords as number[]];
    for (const c of list) {
      if (c.length >= 2) coordinates.push([c[0], c[1]]);
    }
  }

  if (coordinates.length < 2) {
    throw new Error("경로 좌표를 파싱할 수 없습니다.");
  }

  const segmentDistances: number[] = [];
  let totalFromSegments = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const d = haversineMeters(coordinates[i - 1], coordinates[i]);
    segmentDistances.push(d);
    totalFromSegments += d;
  }

  const lngs = coordinates.map((c) => c[0]);
  const lats = coordinates.map((c) => c[1]);

  const meta = extractRouteMeta(data);
  const totalDistance =
    meta.totalDistance ?? Math.round(totalFromSegments);
  const totalTime =
    meta.totalTime && meta.totalTime > 0
      ? meta.totalTime
      : estimateTimeSec(totalDistance);

  const pathCoordinates = buildPathCoordinates(coordinates);
  const pathDistance = computePathDistance(pathCoordinates);
  const guidances = parseGuidances(data, pathCoordinates);
  const linkSegments = parseLinkSegments(data, pathDistance);
  const averageSpeedKmh =
    totalTime > 0 ? (totalDistance / totalTime) * 3.6 : 0;

  return {
    totalDistance,
    totalTime,
    totalFare: meta.totalFare,
    taxiFare: meta.taxiFare,
    averageSpeedKmh,
    linkSegments,
    coordinates,
    pathCoordinates,
    pathDistance,
    segmentDistances,
    bounds: {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    },
    guidances,
  };
}
