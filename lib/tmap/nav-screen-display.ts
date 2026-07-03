import {
  buildNavInstruction,
  formatNavDistance,
  getGuidanceDistanceM,
  getTurnIconKind,
  resolveGuidanceAtProgress,
  type NavGuidanceState,
  type NavPhase,
  type TurnIconKind,
} from "@/lib/tmap/guidance";
import {
  buildNavInstructionForTts,
  formatSurfaceBadgeForTts,
} from "@/lib/tmap/nav-distance-tts";
import { EMPTY_ROUTE_SURFACE, formatRouteSurfaceBadge } from "@/lib/tmap/route-surface";
import type { RouteSurfaceSnapshot } from "@/lib/tmap/route-surface";
import type { SignalStop } from "@/lib/tmap/signal-stops";
import type { RouteResponse } from "@/lib/tmap/types";
import type { SimStatus } from "@/stores/simulation-store";

function isAtSignalStop(input: {
  status: SimStatus;
  signalStopRemainingMs: number;
}): boolean {
  return input.status === "running" && input.signalStopRemainingMs > 0;
}

export type NavScreenDisplayInput = {
  status: SimStatus;
  progress: number;
  route: RouteResponse;
  routeSurface: RouteSurfaceSnapshot;
  signalStopRemainingMs: number;
  activeSignalStop: SignalStop | null;
};

/** 화면 HUD(`RouteGuidanceOverlay`)와 동일한 안내 상태 */
export type NavScreenDisplay = {
  nav: NavGuidanceState;
  atSignal: boolean;
  phase: NavPhase;
  primary: string;
  secondary: string | null;
  surfaceBadge: string | null;
  showDistance: boolean;
  distanceLabel: string | null;
  iconKind: TurnIconKind;
  signalStopId: number | null;
  signalLabel: string | null;
};

export function resolveNavScreenDisplay(
  input: NavScreenDisplayInput
): NavScreenDisplay | null {
  const { route, status, progress, routeSurface } = input;
  if (!route.guidances.length) return null;

  const atSignal = isAtSignalStop({
    status: input.status,
    signalStopRemainingMs: input.signalStopRemainingMs,
  });

  const nav = resolveGuidanceAtProgress(route, progress);
  const { upcoming, phase } = nav;
  if (!upcoming) return null;

  const { primary, secondary } = buildNavInstruction(nav);
  const iconKind = getTurnIconKind(upcoming.turnType);
  const guidanceDistM = getGuidanceDistanceM(nav);
  const showDistance =
    status !== "arrived" && phase !== "now" && phase !== "arrived";

  const surfaceBadge = formatRouteSurfaceBadge(routeSurface, formatNavDistance);

  return {
    nav,
    atSignal,
    phase,
    primary: atSignal
      ? `약 ${Math.ceil(input.signalStopRemainingMs / 1000)}초 후 출발`
      : primary,
    secondary,
    surfaceBadge,
    showDistance,
    distanceLabel: showDistance ? formatNavDistance(guidanceDistM) : null,
    iconKind,
    signalStopId: atSignal ? (input.activeSignalStop?.id ?? null) : null,
    signalLabel: atSignal ? (input.activeSignalStop?.label ?? null) : null,
  };
}

/**
 * 네비 음성 안내 구간 — 1km → 500m → 100m → 잠시후(50m 이하)
 * rank가 클수록 멀리, 작을수록 가까움 (역행 안내 방지용)
 */
export const NAV_TTS_MILESTONE_RANK: Record<string, number> = {
  ahead: 5,
  "1000": 4,
  "500": 3,
  "100": 2,
  soon: 1,
  arrived: 0,
};

export function resolveNavTtsMilestone(
  nav: NavGuidanceState,
  phase: NavPhase
): string {
  if (phase === "arrived") return "arrived";
  const d = getGuidanceDistanceM(nav);
  if (d <= 50) return "soon";
  if (d <= 100) return "100";
  if (d <= 500) return "500";
  if (d <= 1000) return "1000";
  return "ahead";
}

export function getNavTtsMilestoneRank(milestone: string): number {
  return NAV_TTS_MILESTONE_RANK[milestone] ?? -1;
}

/** 같은 매뉴벼에서 멀리 있는 구간(100m)이 잠시후 뒤에 나오지 않도록 */
export function shouldAdvanceNavTtsMilestone(
  maneuverIndex: number,
  milestone: string,
  last: { maneuverIndex: number; rank: number } | null
): boolean {
  const rank = getNavTtsMilestoneRank(milestone);
  if (rank < 0) return true;
  if (!last || last.maneuverIndex !== maneuverIndex) return true;
  return rank < last.rank;
}

/** TTS 재생 트리거 — 매뉴벼·거리 구간·지하 상태 (신호·연속 거리 갱신 제외) */
export function navTtsChangeKey(
  display: NavScreenDisplay,
  routeSurface: RouteSurfaceSnapshot = EMPTY_ROUTE_SURFACE
): string {
  if (display.atSignal) return "signal-skip";

  const { nav, phase } = display;
  return [
    nav.upcoming?.index ?? -1,
    resolveNavTtsMilestone(nav, phase),
    routeSurface.kind,
    routeSurface.phase,
  ].join("|");
}

export function navTtsChangeKeyFromInput(input: NavScreenDisplayInput): string {
  const display = resolveNavScreenDisplay(input);
  if (!display) return "empty";
  return navTtsChangeKey(display, input.routeSurface);
}

/** 메인 HUD 기준 음성 문장 (속도·목적지 잔여·신호 제외) */
export function buildNavTtsUtterance(
  display: NavScreenDisplay,
  status: SimStatus
): string | null {
  if (status !== "running" && status !== "arrived") return null;
  if (display.atSignal) return null;

  const { nav, surfaceBadge } = display;
  const { primary, secondary } = buildNavInstructionForTts(nav);
  const parts: string[] = [];
  if (surfaceBadge) parts.push(formatSurfaceBadgeForTts(surfaceBadge));
  parts.push(primary);
  if (secondary) parts.push(secondary);
  return parts.join(" ").replace(/\s+/g, " ").trim() || null;
}

export function buildNavTtsUtteranceFromInput(
  input: NavScreenDisplayInput
): string | null {
  const display = resolveNavScreenDisplay(input);
  if (!display) return null;
  return buildNavTtsUtterance(display, input.status);
}
