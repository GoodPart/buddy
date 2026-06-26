import { create } from "zustand";
import { interpolateAlongRoute } from "@/lib/tmap/interpolate";
import type { Place, RoutePosition, RouteResponse } from "@/lib/tmap/types";

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

const initial = {
  status: "idle" as SimStatus,
  departure: null,
  destination: null,
  route: null,
  progress: 0,
  speedMultiplier: 1 as const,
  currentPosition: null,
  pauseCount: 0,
  totalPausedMs: 0,
  pausedAt: null,
};

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
    set({
      route,
      status: "ready",
      progress: 0,
      currentPosition: pos,
      pauseCount: 0,
      totalPausedMs: 0,
      pausedAt: null,
    });
  },

  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),

  start: () => {
    const { route, status } = get();
    if (!route || status !== "ready") return;
    set({ status: "running", pausedAt: null });
  },

  pause: () => {
    const { status } = get();
    if (status !== "running") return;
    set({ status: "paused", pauseCount: get().pauseCount + 1, pausedAt: Date.now() });
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
    const { status, route, progress, speedMultiplier } = get();
    if (status !== "running" || !route || route.totalTime <= 0) return;

    const deltaProgress = (deltaMs / 1000) * speedMultiplier / route.totalTime;
    const next = Math.min(1, progress + deltaProgress);
    const currentPosition = interpolateAlongRoute(route, next);

    if (next >= 1) {
      set({ progress: 1, currentPosition, status: "arrived" });
      return;
    }
    set({ progress: next, currentPosition });
  },
}));