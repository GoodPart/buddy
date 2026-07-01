import type { RouteGuidance } from "./types";

/** 지형(DEM) 위 추가 상승 — 교량·고가 덱 근사치(m) */
export type ElevatedSegment = {
  startM: number;
  endM: number;
  offsetM: number;
};

const ELEVATED_TURN_TYPES = new Set([107, 120]);
const ELEVATED_KEYWORDS = /교량|대교|고가|육교|철교|고가도로|고가차로/i;

const RAMP_BEFORE_M = 100;
const RAMP_AFTER_M = 1500;
/** hint-offset 적용 지연 — 구간 진입 직후 평지에서 뜨는 현상 방지 */
const HINT_OFFSET_DELAY_M = 70;
const DEFAULT_OFFSET_M = 15;
const TURN_TYPE_OFFSET: Partial<Record<number, number>> = {
  107: 14,
  120: 18,
};

function isElevatedGuidance(g: RouteGuidance): boolean {
  if (g.turnType != null && ELEVATED_TURN_TYPES.has(g.turnType)) return true;
  const text = `${g.name ?? ""} ${g.description} ${g.nextRoadName ?? ""}`;
  return ELEVATED_KEYWORDS.test(text);
}

function offsetForGuidance(g: RouteGuidance): number {
  if (g.turnType != null && TURN_TYPE_OFFSET[g.turnType] != null) {
    return TURN_TYPE_OFFSET[g.turnType]!;
  }
  return DEFAULT_OFFSET_M;
}

function mergeSegments(segments: ElevatedSegment[]): ElevatedSegment[] {
  if (!segments.length) return [];

  const sorted = [...segments].sort((a, b) => a.startM - b.startM);
  const merged: ElevatedSegment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = merged[merged.length - 1];

    if (cur.startM <= prev.endM + 80) {
      prev.endM = Math.max(prev.endM, cur.endM);
      prev.offsetM = Math.max(prev.offsetM, cur.offsetM);
      continue;
    }

    merged.push(cur);
  }

  return merged;
}

/** 경로 안내에서 교량·고가 구간 추출 */
export function buildElevatedSegments(
  guidances: RouteGuidance[],
  pathDistanceM: number
): ElevatedSegment[] {
  if (!guidances.length || pathDistanceM <= 0) return [];

  const sorted = [...guidances].sort(
    (a, b) => a.distanceAlongRoute - b.distanceAlongRoute
  );

  const segments: ElevatedSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i];
    if (!isElevatedGuidance(g)) continue;

    const startM = Math.max(0, g.distanceAlongRoute - RAMP_BEFORE_M);
    const next = sorted[i + 1];
    const endM = next
      ? Math.min(pathDistanceM, next.distanceAlongRoute)
      : Math.min(pathDistanceM, g.distanceAlongRoute + RAMP_AFTER_M);

    if (endM <= startM) continue;

    segments.push({
      startM,
      endM,
      offsetM: offsetForGuidance(g),
    });
  }

  return mergeSegments(segments);
}

export function lookupElevatedOffsetM(
  traveledM: number,
  segments: ElevatedSegment[]
): number {
  if (!segments.length || !Number.isFinite(traveledM)) return 0;

  for (const seg of segments) {
    if (traveledM >= seg.startM && traveledM <= seg.endM) {
      const hintStartM = seg.startM + HINT_OFFSET_DELAY_M;
      if (traveledM < hintStartM) return 0;
      return seg.offsetM;
    }
  }

  return 0;
}
