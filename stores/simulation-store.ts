import { create } from "zustand";
import { getRoutePathDistanceM } from "@/lib/tmap/guidance";
import { advanceTraveledM } from "@/lib/tmap/route-speed";
import { interpolateAlongRoute } from "@/lib/tmap/interpolate";
import {
  buildSignalStopsFromGuidances,
  clampToSignalStop,
  findSignalStopTrigger,
  type SignalStop,
} from "@/lib/tmap/signal-stops";
import { buildElevatedSegments } from "@/lib/tmap/elevated-segments";
import {
  EMPTY_ROUTE_SURFACE,
  resolveRouteSurface,
  type RouteSurfaceSnapshot,
} from "@/lib/tmap/route-surface";
import type { Place, RoutePosition, RouteResponse } from "@/lib/tmap/types";
import { drivingSurfaceHeight } from "@/lib/vworld/surface-probe";

export type SimStatus = "idle" | "ready" | "running" | "paused" | "arrived";

type SimulationState = {
  status: SimStatus;
  departure: Place | null;
  destination: Place | null;
  route: RouteResponse | null;
  progress: number;
  speedMultiplier: 1 | 2 | 5;
  currentPosition: RoutePosition | null;
  pauseCount: number;
  totalPausedMs: number;
  pausedAt: number | null;

  /** 1단계: 안내점 기반 신호 정지 */
  signalStops: SignalStop[];
  passedSignalStopIds: number[];
  signalStopRemainingMs: number;
  activeSignalStop: SignalStop | null;

  /** Tmap 안내 기반 지하·터널 주행 상태 */
  routeSurface: RouteSurfaceSnapshot;

  setDeparture: (p: Place | null) => void;
  setDestination: (p: Place | null) => void;
  setRoute: (route: RouteResponse | null) => void;
  setSpeedMultiplier: (m: 1 | 2 | 5) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (deltaMs: number) => void;
};

const simResetFields = {
  progress: 0,
  speedMultiplier: 1 as const,
  currentPosition: null as RoutePosition | null,
  pauseCount: 0,
  totalPausedMs: 0,
  pausedAt: null as number | null,
  signalStops: [] as SignalStop[],
  passedSignalStopIds: [] as number[],
  signalStopRemainingMs: 0,
  activeSignalStop: null as SignalStop | null,
  routeSurface: EMPTY_ROUTE_SURFACE,
};

const initial = {
  status: "idle" as SimStatus,
  departure: null,
  destination: null,
  route: null,
  ...simResetFields,
};

function surfaceForRoute(route: RouteResponse, progress: number): RouteSurfaceSnapshot {
  const pathDistM = getRoutePathDistanceM(route);
  const traveledM = Math.min(1, Math.max(0, progress)) * pathDistM;
  return resolveRouteSurface(traveledM, route.undergroundSegments ?? []);
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initial,

  setDeparture: (departure) => set({ departure }),
  setDestination: (destination) => set({ destination }),

  setRoute: (route) => {
    if (!route) {
      set({ ...initial });
      return;
    }
    const pos: RoutePosition = interpolateAlongRoute(route, 0);
    drivingSurfaceHeight.setElevatedSegments(
      buildElevatedSegments(route.guidances, getRoutePathDistanceM(route))
    );
    set({
      route,
      status: "ready",
      departure: get().departure,
      destination: get().destination,
      ...simResetFields,
      currentPosition: pos,
      signalStops: buildSignalStopsFromGuidances(route.guidances),
      routeSurface: surfaceForRoute(route, 0),
    });
  },

  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),

  start: () => {
    const { route, status } = get();
    if (!route || status !== "ready") return;
    set({
      status: "running",
      pausedAt: null,
      signalStopRemainingMs: 0,
      activeSignalStop: null,
    });
  },

  pause: () => {
    const { status } = get();
    if (status !== "running") return;
    set({
      status: "paused",
      pauseCount: get().pauseCount + 1,
      pausedAt: Date.now(),
      signalStopRemainingMs: 0,
      activeSignalStop: null,
    });
  },

  resume: () => {
    const { status, pausedAt, totalPausedMs } = get();
    if (status !== "paused" || pausedAt == null) return;
    set({
      status: "running",
      totalPausedMs: totalPausedMs + (Date.now() - pausedAt),
      pausedAt: null,
    });
  },

  reset: () => set({ ...initial }),

  tick: (deltaMs) => {
    const {
      status,
      route,
      progress,
      speedMultiplier,
      signalStopRemainingMs,
      signalStops,
      passedSignalStopIds,
    } = get();
    if (status !== "running" || !route || route.totalTime <= 0) return;

    const pathDistM = getRoutePathDistanceM(route);
    if (pathDistM <= 0) return;

    if (signalStopRemainingMs > 0) {
      const remaining = Math.max(
        0,
        signalStopRemainingMs - deltaMs * speedMultiplier
      );
      if (remaining > 0) {
        set({ signalStopRemainingMs: remaining });
        return;
      }
      set({ signalStopRemainingMs: 0, activeSignalStop: null });
    }

    const traveledM = progress * pathDistM;
    const nextTraveledM = advanceTraveledM(
      route,
      traveledM,
      deltaMs,
      speedMultiplier
    );

    const passedSet = new Set(passedSignalStopIds);
    const triggered = findSignalStopTrigger(
      signalStops,
      passedSet,
      traveledM,
      nextTraveledM
    );

    if (triggered) {
      const stopM = clampToSignalStop(triggered);
      const stopProgress = Math.min(1, stopM / pathDistM);
      set({
        progress: stopProgress,
        currentPosition: interpolateAlongRoute(route, stopProgress),
        signalStopRemainingMs: triggered.waitDurationMs,
        activeSignalStop: triggered,
        passedSignalStopIds: [...passedSignalStopIds, triggered.id],
        routeSurface: surfaceForRoute(route, stopProgress),
      });
      return;
    }

    const next = nextTraveledM / pathDistM;
    const currentPosition = interpolateAlongRoute(route, next);

    if (next >= 1) {
      set({
        progress: 1,
        currentPosition,
        status: "arrived",
        signalStopRemainingMs: 0,
        activeSignalStop: null,
        routeSurface: surfaceForRoute(route, 1),
      });
      return;
    }
    set({
      progress: next,
      currentPosition,
      routeSurface: surfaceForRoute(route, next),
    });
  },
}));

/** 신호 대기 중 (사용자 일시정지와 구분) */
export function isAtSignalStop(state: {
  status: SimStatus;
  signalStopRemainingMs: number;
}): boolean {
  return state.status === "running" && state.signalStopRemainingMs > 0;
}
