import type { RouteGuidance } from "./types";

/** 2단계 ITS 연동 시 source 확장 */
export type SignalStopSource = "guidance";

export type SignalStop = {
  id: number;
  distanceAlongRoute: number;
  waitDurationMs: number;
  label: string;
  turnType?: number;
  source: SignalStopSource;
};

/** 정지 트리거 — 교차로 직전 (m) */
export const SIGNAL_TRIGGER_BEFORE_M = 15;

/** 신호 대기가 필요한 turnType (출발·도착·고속·터널·단순 직진 제외) */
const SIGNAL_TURN_TYPES = new Set([
  12, 13, 14, 16, 17, 18, 19,
  104, 105, 123, 124, 126,
  109, 110, 111,
]);

function waitDurationMs(turnType?: number, index = 0): number {
  const base =
    turnType === 111 || turnType === 110
      ? 4500
      : turnType === 12 || turnType === 13 || turnType === 16 || turnType === 17
        ? 3800
        : turnType === 109
          ? 2800
          : 3200;
  const jitter = (index % 5) * 400;
  return base + jitter;
}

export function isSignalStopTurnType(turnType?: number): boolean {
  if (turnType == null) return false;
  if (turnType === 200 || turnType === 201) return false;
  return SIGNAL_TURN_TYPES.has(turnType);
}

/** Tmap 안내점 → 1단계 신호 정지 이벤트 (추후 ITS 목록과 병합 가능) */
export function buildSignalStopsFromGuidances(
  guidances: RouteGuidance[]
): SignalStop[] {
  const stops: SignalStop[] = [];

  for (const g of guidances) {
    if (!isSignalStopTurnType(g.turnType)) continue;
    if (g.distanceAlongRoute <= 0) continue;

    stops.push({
      id: g.index,
      distanceAlongRoute: g.distanceAlongRoute,
      waitDurationMs: waitDurationMs(g.turnType, g.index),
      label: g.turnLabel,
      turnType: g.turnType,
      source: "guidance",
    });
  }

  return stops.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
}

/** 주행 거리 구간에서 새로 트리거될 정지 (가장 가까운 1개) */
export function findSignalStopTrigger(
  stops: SignalStop[],
  passedIds: ReadonlySet<number>,
  prevTraveledM: number,
  nextTraveledM: number
): SignalStop | null {
  for (const stop of stops) {
    if (passedIds.has(stop.id)) continue;

    const triggerAt = stop.distanceAlongRoute - SIGNAL_TRIGGER_BEFORE_M;
    if (prevTraveledM < triggerAt && nextTraveledM >= triggerAt) {
      return stop;
    }
  }
  return null;
}

/** 정지 위치로 클램프할 경로상 거리 */
export function clampToSignalStop(stop: SignalStop): number {
  return Math.max(0, stop.distanceAlongRoute - SIGNAL_TRIGGER_BEFORE_M);
}

/** 2단계: ITS 신호 정지 목록과 병합 (distance 기준 dedupe) */
export function mergeSignalStops(
  ...groups: SignalStop[][]
): SignalStop[] {
  const byDistance = new Map<number, SignalStop>();
  for (const group of groups) {
    for (const stop of group) {
      const key = Math.round(stop.distanceAlongRoute);
      if (!byDistance.has(key)) {
        byDistance.set(key, stop);
      }
    }
  }
  return [...byDistance.values()].sort(
    (a, b) => a.distanceAlongRoute - b.distanceAlongRoute
  );
}
