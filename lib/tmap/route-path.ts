import { haversineMeters } from "./geo";

/** 지도 polyline + 시뮬레이션 마커가 공유하는 경로 (동일 좌표 = 선 위 이동) */
export const MAX_PATH_POINTS = 500;
/** 도심 코너·건물 구역을 가로지르지 않도록 촘촘히 샘플링(m) */
export const PATH_SAMPLE_METERS = 25;
const CORNER_ANGLE_DEG = 8;

function bearingDegrees(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function angleDeltaDeg(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 거리 간격 + 급커브 정점 보존 — 직선 chord로 건물·광장을 가로지르지 않음 */
export function buildPathCoordinates(
  coords: [number, number][]
): [number, number][] {
  if (coords.length <= 2) return coords;

  const result: [number, number][] = [coords[0]];
  let sinceLastSample = 0;

  for (let i = 1; i < coords.length; i++) {
    const seg = haversineMeters(coords[i - 1], coords[i]);
    sinceLastSample += seg;

    const isLast = i === coords.length - 1;
    let sharpCorner = false;
    if (i >= 2) {
      const b1 = bearingDegrees(coords[i - 2], coords[i - 1]);
      const b2 = bearingDegrees(coords[i - 1], coords[i]);
      sharpCorner = angleDeltaDeg(b1, b2) >= CORNER_ANGLE_DEG;
    }

    const needSample =
      sinceLastSample >= PATH_SAMPLE_METERS ||
      sharpCorner ||
      isLast ||
      result.length >= MAX_PATH_POINTS - 1;

    if (needSample) {
      const prev = result[result.length - 1];
      const corner = coords[i - 1];
      if (sharpCorner && (corner[0] !== prev[0] || corner[1] !== prev[1])) {
        result.push(corner);
      }
      result.push(coords[i]);
      sinceLastSample = 0;
    }
  }

  const last = coords[coords.length - 1];
  const tail = result[result.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) {
    result.push(last);
  }

  result[0] = coords[0];
  result[result.length - 1] = last;

  return result;
}

export function computePathDistance(coords: [number, number][]): number {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineMeters(coords[i - 1], coords[i]);
  }
  return Math.round(sum);
}
