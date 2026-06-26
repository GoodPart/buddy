import { haversineMeters } from "./geo";

/** 지도 polyline + 시뮬레이션 마커가 공유하는 경로 (동일 좌표 = 선 위 이동) */
export const MAX_PATH_POINTS = 100;
export const PATH_SAMPLE_METERS = 120;

/** 거리 간격으로 샘플링 — index decimation보다 곡선을 잘 따름 */
export function buildPathCoordinates(
  coords: [number, number][]
): [number, number][] {
  if (coords.length <= 2) return coords;
  if (coords.length <= MAX_PATH_POINTS) return [...coords];

  const result: [number, number][] = [coords[0]];
  let accumulated = 0;
  let sinceLastSample = 0;

  for (let i = 1; i < coords.length; i++) {
    const seg = haversineMeters(coords[i - 1], coords[i]);
    accumulated += seg;
    sinceLastSample += seg;

    const isLast = i === coords.length - 1;
    const needSample =
      sinceLastSample >= PATH_SAMPLE_METERS ||
      isLast ||
      result.length >= MAX_PATH_POINTS - 1;

    if (needSample) {
      result.push(coords[i]);
      sinceLastSample = 0;
    }
  }

  const last = coords[coords.length - 1];
  const tail = result[result.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) {
    result.push(last);
  }

  // polyline·마커 양 끝 = Tmap 경로 좌표와 반드시 일치
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
