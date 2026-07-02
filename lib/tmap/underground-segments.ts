import type { RouteGuidance } from "./types";

export type UndergroundKind = "underpass" | "tunnel";

/** Tmap 안내 기반 지하 구간 — entryM~exitM 동안 지하 운행 상태 */
export type UndergroundSegment = {
  kind: UndergroundKind;
  /** 안내점(진입) 거리 */
  entryM: number;
  /** 탈출 추정 거리 */
  exitM: number;
  label: string;
};

const UNDERPASS_TURN_TYPES = new Set([106]);
const TUNNEL_TURN_TYPES = new Set([108, 121]);
/** 진입 판별 — turnType 우선, 키워드는 보조(지하철 등 오탐 방지) */
const UNDERPASS_KEYWORDS = /지하차도|지하(?:차도|도로)/i;
const TUNNEL_KEYWORDS = /터널/i;
const EXIT_KEYWORDS = /탈출|출구|지상(?:도로|진입)?|일반도로/i;
const EXIT_TURN_TYPES = new Set([103]);

/** 지하차도·터널 최대 추정 길이 — exitM 상한 */
export const MAX_UNDERPASS_SPAN_M = 800;
export const MAX_TUNNEL_SPAN_M = 5000;
const DEFAULT_EXIT_AFTER_UNDERPASS_M = 600;
const DEFAULT_EXIT_AFTER_TUNNEL_M = 2000;
const MERGE_GAP_M = 80;
/** 이미 만든 구간 안의 중복 진입 안내 무시 */
const NESTED_ENTRY_BUFFER_M = 30;

function guidanceText(g: RouteGuidance): string {
  return `${g.name ?? ""} ${g.description} ${g.nextRoadName ?? ""}`;
}

function classifyUndergroundEntry(g: RouteGuidance): UndergroundKind | null {
  if (g.turnType != null) {
    if (UNDERPASS_TURN_TYPES.has(g.turnType)) return "underpass";
    if (TUNNEL_TURN_TYPES.has(g.turnType)) return "tunnel";
  }
  const text = guidanceText(g);
  if (TUNNEL_KEYWORDS.test(text)) return "tunnel";
  if (UNDERPASS_KEYWORDS.test(text)) return "underpass";
  return null;
}

/** 연속 지하 안내 — turnType만 (키워드는 지하철 등 오탐 유발) */
function isUndergroundContinuation(g: RouteGuidance): boolean {
  if (g.turnType == null) return false;
  return UNDERPASS_TURN_TYPES.has(g.turnType) || TUNNEL_TURN_TYPES.has(g.turnType);
}

function isUndergroundExit(g: RouteGuidance): boolean {
  if (g.turnType != null && EXIT_TURN_TYPES.has(g.turnType)) return true;
  return EXIT_KEYWORDS.test(guidanceText(g));
}

function maxSpanForKind(kind: UndergroundKind): number {
  return kind === "tunnel" ? MAX_TUNNEL_SPAN_M : MAX_UNDERPASS_SPAN_M;
}

function defaultExitAfterM(kind: UndergroundKind): number {
  return kind === "tunnel" ? DEFAULT_EXIT_AFTER_TUNNEL_M : DEFAULT_EXIT_AFTER_UNDERPASS_M;
}

function labelForGuidance(g: RouteGuidance, kind: UndergroundKind): string {
  const name = g.name?.trim() || g.nextRoadName?.trim();
  if (name) return name;
  return kind === "tunnel" ? "터널" : "지하차도";
}

/**
 * 탈출 거리 추정
 * - 명시적 탈출(103·키워드) 우선, 단 entry+maxSpan 이내
 * - 그다음 가까운 비지하 안내(maxSpan 이내만)
 * - 없으면 entry + default span — 원거리 다음 안내로 exit 늘리지 않음
 */
function findExitM(
  sorted: RouteGuidance[],
  entryIdx: number,
  pathDistanceM: number,
  kind: UndergroundKind
): number {
  const entryM = sorted[entryIdx].distanceAlongRoute;
  const maxSpan = maxSpanForKind(kind);
  const hardCap = Math.min(pathDistanceM, entryM + maxSpan);
  const fallbackExit = Math.min(pathDistanceM, entryM + defaultExitAfterM(kind));

  for (let j = entryIdx + 1; j < sorted.length; j++) {
    const g = sorted[j];
    if (g.distanceAlongRoute > hardCap) break;
    if (isUndergroundContinuation(g)) continue;
    if (isUndergroundExit(g)) {
      return Math.min(hardCap, g.distanceAlongRoute);
    }
  }

  for (let j = entryIdx + 1; j < sorted.length; j++) {
    const g = sorted[j];
    const dist = g.distanceAlongRoute;
    if (dist > hardCap) break;
    if (isUndergroundContinuation(g)) continue;
    if (dist - entryM <= maxSpan) {
      return dist;
    }
    break;
  }

  return fallbackExit;
}

function isNestedEntry(entryM: number, segments: UndergroundSegment[]): boolean {
  return segments.some(
    (s) =>
      entryM > s.entryM + NESTED_ENTRY_BUFFER_M && entryM < s.exitM - NESTED_ENTRY_BUFFER_M
  );
}

function mergeSegments(segments: UndergroundSegment[]): UndergroundSegment[] {
  if (!segments.length) return [];

  const sorted = [...segments].sort((a, b) => a.entryM - b.entryM);
  const merged: UndergroundSegment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = merged[merged.length - 1];

    if (cur.kind === prev.kind && cur.entryM <= prev.exitM + MERGE_GAP_M) {
      prev.exitM = Math.max(prev.exitM, cur.exitM);
      if (cur.label.length > prev.label.length) prev.label = cur.label;
      continue;
    }

    merged.push(cur);
  }

  return merged;
}

/** 경로 안내에서 지하차도·터널 구간 추출 */
export function buildUndergroundSegments(
  guidances: RouteGuidance[],
  pathDistanceM: number
): UndergroundSegment[] {
  if (!guidances.length || pathDistanceM <= 0) return [];

  const sorted = [...guidances].sort(
    (a, b) => a.distanceAlongRoute - b.distanceAlongRoute
  );

  const segments: UndergroundSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i];
    const kind = classifyUndergroundEntry(g);
    if (!kind) continue;

    const entryM = g.distanceAlongRoute;
    if (isNestedEntry(entryM, segments)) continue;

    const exitM = findExitM(sorted, i, pathDistanceM, kind);
    if (exitM <= entryM) continue;

    segments.push({
      kind,
      entryM,
      exitM,
      label: labelForGuidance(g, kind),
    });
  }

  return mergeSegments(segments);
}
