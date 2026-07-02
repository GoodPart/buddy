import {
  formatNavDistance,
  getTurnIconKind,
  resolveGuidanceAtProgress,
  type TurnIconKind,
} from "@/lib/tmap/guidance";
import { formatRouteSurfaceBadge } from "@/lib/tmap/route-surface";
import type { RouteSurfaceSnapshot } from "@/lib/tmap/route-surface";
import type { SignalStop } from "@/lib/tmap/signal-stops";
import type { Place, RouteResponse } from "@/lib/tmap/types";
import type { SimStatus } from "@/stores/simulation-store";

function isAtSignalStop(input: {
  status: SimStatus;
  signalStopRemainingMs: number;
}): boolean {
  return input.status === "running" && input.signalStopRemainingMs > 0;
}

export type NavHudSnapshot = {
  primary: string;
  secondary: string | null;
  badge: string | null;
  iconKind: TurnIconKind;
};

export const EMPTY_NAV_HUD: NavHudSnapshot = {
  primary: "",
  secondary: null,
  badge: null,
  iconKind: "unknown",
};

export type NavHudSyncInput = {
  status: SimStatus;
  progress: number;
  route: RouteResponse | null;
  destination: Place | null;
  routeSurface: RouteSurfaceSnapshot;
  signalStopRemainingMs: number;
  activeSignalStop: SignalStop | null;
};

/** PiP·이벤트 HUD — 거리·속도 제외, 매뉴버·상태 변경만 */
export function navHudChangeKey(input: NavHudSyncInput): string {
  if (!input.route) return "no-route";

  const atSignal = isAtSignalStop({
    status: input.status,
    signalStopRemainingMs: input.signalStopRemainingMs,
  });

  const nav = resolveGuidanceAtProgress(input.route, input.progress);
  const upcoming = nav.upcoming;

  return [
    input.status,
    atSignal ? "signal" : "go",
    atSignal ? input.activeSignalStop?.id ?? 0 : 0,
    upcoming?.index ?? -1,
    upcoming?.turnType ?? -1,
    input.routeSurface.kind,
    input.routeSurface.phase,
  ].join("|");
}

export function buildNavHudSnapshot(input: NavHudSyncInput): NavHudSnapshot {
  const { route, status, progress, routeSurface } = input;
  if (!route || route.guidances.length === 0) {
    return EMPTY_NAV_HUD;
  }

  const atSignal = isAtSignalStop({
    status: input.status,
    signalStopRemainingMs: input.signalStopRemainingMs,
  });

  const nav = resolveGuidanceAtProgress(route, progress);
  const { upcoming } = nav;

  if (atSignal) {
    return {
      primary: "신호 대기",
      secondary: input.activeSignalStop?.label ?? null,
      badge: null,
      iconKind: "unknown",
    };
  }

  const surfaceBadge = formatRouteSurfaceBadge(routeSurface, formatNavDistance);

  if (status === "arrived" || !upcoming) {
    return {
      primary: "목적지 도착",
      secondary: input.destination?.name ?? null,
      badge: surfaceBadge,
      iconKind: "arrive",
    };
  }

  if (upcoming.turnType === 201) {
    return {
      primary: "목적지",
      secondary: upcoming.name ?? upcoming.description,
      badge: surfaceBadge,
      iconKind: "arrive",
    };
  }

  const road =
    upcoming.nextRoadName ?? upcoming.name ?? upcoming.description ?? null;

  return {
    primary: upcoming.turnLabel,
    secondary: road,
    badge: surfaceBadge,
    iconKind: getTurnIconKind(upcoming.turnType),
  };
}
