import type { UndergroundSegment } from "./underground-segments";

export type RouteSurfaceKind = "road" | "underpass" | "tunnel";

export type RouteSurfacePhase =
  | "normal"
  | "approaching"
  | "entering"
  | "inside"
  | "exiting";

export type RouteSurfaceSnapshot = {
  kind: RouteSurfaceKind;
  phase: RouteSurfacePhase;
  segment: UndergroundSegment | null;
  distanceToEntryM: number | null;
  distanceToExitM: number | null;
  label: string | null;
};

export type RouteSurfaceEvent = "UNDERPASS_ENTER" | "UNDERPASS_EXIT" | "TUNNEL_ENTER" | "TUNNEL_EXIT";

const APPROACH_BEFORE_M = 300;
const INSIDE_START_OFFSET_M = 50;
const INSIDE_END_OFFSET_M = 50;

export const EMPTY_ROUTE_SURFACE: RouteSurfaceSnapshot = {
  kind: "road",
  phase: "normal",
  segment: null,
  distanceToEntryM: null,
  distanceToExitM: null,
  label: null,
};

function kindFromSegment(seg: UndergroundSegment): RouteSurfaceKind {
  return seg.kind;
}

/**
 * 주행 거리(m) 기준 — 지하 진입·운행·탈출 상태.
 * 매 호출마다 순수 계산(이전 snapshot 유지 없음). 구간 밖이면 road/normal.
 */
export function resolveRouteSurface(
  traveledM: number,
  segments: UndergroundSegment[]
): RouteSurfaceSnapshot {
  if (!segments.length || !Number.isFinite(traveledM)) {
    return EMPTY_ROUTE_SURFACE;
  }

  for (const seg of segments) {
    const approachStart = seg.entryM - APPROACH_BEFORE_M;
    if (traveledM < approachStart || traveledM > seg.exitM) continue;

    const kind = kindFromSegment(seg);
    const insideStart = seg.entryM + INSIDE_START_OFFSET_M;
    const insideEnd = Math.max(insideStart, seg.exitM - INSIDE_END_OFFSET_M);

    let phase: RouteSurfacePhase = "normal";
    if (traveledM < seg.entryM) {
      phase = "approaching";
    } else if (traveledM < insideStart) {
      phase = "entering";
    } else if (traveledM < insideEnd) {
      phase = "inside";
    } else if (traveledM <= seg.exitM) {
      phase = "exiting";
    }

    return {
      kind,
      phase,
      segment: seg,
      distanceToEntryM: Math.max(0, seg.entryM - traveledM),
      distanceToExitM: Math.max(0, seg.exitM - traveledM),
      label: seg.label,
    };
  }

  return EMPTY_ROUTE_SURFACE;
}

/** dev: 콘솔에서 undergroundSegments·phase 확인 */
export function inspectRouteSurface(
  traveledM: number,
  segments: UndergroundSegment[]
): RouteSurfaceSnapshot {
  const surface = resolveRouteSurface(traveledM, segments);
  console.log("[buddy] route surface", {
    traveledM,
    undergroundSegments: segments,
    kind: surface.kind,
    phase: surface.phase,
    entryM: surface.segment?.entryM ?? null,
    exitM: surface.segment?.exitM ?? null,
    distanceToExitM: surface.distanceToExitM,
  });
  return surface;
}

/** kind 변경 시 ENTER/EXIT 이벤트 (UI·음성 훅) */
export function detectRouteSurfaceEvent(
  prev: RouteSurfaceSnapshot,
  next: RouteSurfaceSnapshot
): RouteSurfaceEvent | null {
  if (prev.kind === next.kind) return null;

  if (next.kind === "underpass") return "UNDERPASS_ENTER";
  if (prev.kind === "underpass") return "UNDERPASS_EXIT";
  if (next.kind === "tunnel") return "TUNNEL_ENTER";
  if (prev.kind === "tunnel") return "TUNNEL_EXIT";

  return null;
}

export function isUndergroundDriving(snapshot: RouteSurfaceSnapshot): boolean {
  return (
    (snapshot.kind === "underpass" || snapshot.kind === "tunnel") &&
    (snapshot.phase === "entering" ||
      snapshot.phase === "inside" ||
      snapshot.phase === "exiting")
  );
}

/** HUD 배지 문구 */
export function formatRouteSurfaceBadge(
  snapshot: RouteSurfaceSnapshot,
  formatDistance: (m: number) => string
): string | null {
  if (snapshot.kind === "road" || snapshot.phase === "normal") return null;

  const kindLabel = snapshot.kind === "tunnel" ? "터널" : "지하차도";

  switch (snapshot.phase) {
    case "approaching":
      return snapshot.distanceToEntryM != null
        ? `${kindLabel} 진입 · ${formatDistance(snapshot.distanceToEntryM)}`
        : `${kindLabel} 진입 예정`;
    case "entering":
      return `${kindLabel} 진입`;
    case "inside":
      return snapshot.distanceToExitM != null
        ? `지하 운행중 · 탈출 ${formatDistance(snapshot.distanceToExitM)}`
        : "지하 운행중";
    case "exiting":
      return `${kindLabel} 탈출`;
    default:
      return null;
  }
}
