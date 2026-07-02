"use client";

import { useSimulationStore } from "@/stores";
import {
  formatNavDistance,
  getRoutePathDistanceM,
  resolveGuidanceAtProgress,
  type NavPhase,
} from "@/lib/tmap/guidance";
import { resolveNavScreenDisplay } from "@/lib/tmap/nav-screen-display";
import {
  getSegmentCongestion,
  getSegmentSpeedKmh,
  getSimSpeedKmh,
} from "@/lib/tmap/route-speed";
import {
  getCongestionColor,
  getCongestionLabel,
} from "@/lib/tmap/traffic-congestion";
import TurnIcon from "@/app/_components/tmap/TurnIcon";

const PHASE_PANEL: Record<NavPhase, string> = {
  far: "border-blue-400/50 bg-gray-900/92",
  near: "border-blue-400/60 bg-gray-900/95",
  imminent: "border-amber-400/70 bg-gray-900/95",
  now: "border-orange-400/80 bg-gray-950/95",
  arrived: "border-green-400/70 bg-gray-900/95",
};

const PHASE_DISTANCE: Record<NavPhase, string> = {
  far: "text-blue-100",
  near: "text-blue-50",
  imminent: "text-amber-200",
  now: "text-orange-200",
  arrived: "text-green-300",
};

export default function RouteGuidanceOverlay() {
  const route = useSimulationStore((s) => s.route);
  const status = useSimulationStore((s) => s.status);
  const progress = useSimulationStore((s) => s.progress);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const signalStopRemainingMs = useSimulationStore(
    (s) => s.signalStopRemainingMs
  );
  const activeSignalStop = useSimulationStore((s) => s.activeSignalStop);
  const routeSurface = useSimulationStore((s) => s.routeSurface);

  if (!route || route.guidances.length === 0) return null;

  const display = resolveNavScreenDisplay({
    status,
    progress,
    route,
    routeSurface,
    signalStopRemainingMs,
    activeSignalStop,
  });
  if (!display) return null;

  const nav = resolveGuidanceAtProgress(route, progress);
  const { thenNext, phase } = nav;
  const {
    atSignal,
    primary,
    secondary,
    surfaceBadge,
    showDistance,
    distanceLabel,
    iconKind,
  } = display;

  const pathDist = getRoutePathDistanceM(route);
  const remainingM = Math.max(0, pathDist - nav.traveledM);
  const simSpeedKmh = getSimSpeedKmh(
    route,
    nav.traveledM,
    speedMultiplier,
    status,
    atSignal
  );
  const segmentSpeedKmh = getSegmentSpeedKmh(route, nav.traveledM);
  const segmentCongestion = getSegmentCongestion(route, nav.traveledM);
  const showSpeed = status === "running" || status === "paused";

  const panelClass = atSignal
    ? "border-red-400/70 bg-gray-950/95"
    : routeSurface.phase === "inside"
      ? "border-violet-400/70 bg-gray-950/95"
      : PHASE_PANEL[phase];

  return (
    <div className="absolute top-2 left-2 right-14 z-10 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-[300px] rounded-lg border p-3 shadow-xl backdrop-blur-sm transition-colors ${panelClass}`}
      >
        {atSignal ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">
            신호 대기
            {activeSignalStop ? ` · ${activeSignalStop.label}` : ""}
          </p>
        ) : surfaceBadge ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
            {surfaceBadge}
          </p>
        ) : segmentCongestion != null && segmentCongestion > 0 ? (
          <p
            className="mb-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: getCongestionColor(segmentCongestion) }}
          >
            {getCongestionLabel(segmentCongestion)}
          </p>
        ) : null}
        <div className="flex items-start gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-white/10 p-1.5 ${PHASE_DISTANCE[phase]}`}
          >
            <TurnIcon kind={iconKind} className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            {showDistance && distanceLabel ? (
              <p
                className={`text-2xl font-bold tabular-nums leading-none ${PHASE_DISTANCE[phase]}`}
              >
                {distanceLabel}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold leading-snug text-white">
              {primary}
            </p>
            {secondary ? (
              <p className="mt-0.5 truncate text-xs text-gray-300">
                {secondary}
              </p>
            ) : null}
          </div>

          {showSpeed ? (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums leading-none text-white">
                {status === "paused" ? 0 : simSpeedKmh}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                km/h
              </p>
              {segmentSpeedKmh != null && route.linkSegments.length > 0 ? (
                <p className="mt-1 text-[10px] text-gray-500">
                  구간 {segmentSpeedKmh}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {thenNext && status !== "arrived" && phase !== "arrived" && (
          <p className="mt-2 border-t border-white/10 pt-2 text-xs text-gray-400 leading-snug">
            <span className="text-gray-500">다음 · </span>
            {formatNavDistance(
              Math.max(0, thenNext.distanceAlongRoute - nav.traveledM)
            )}{" "}
            후 {thenNext.turnLabel}
            {thenNext.nextRoadName ? ` · ${thenNext.nextRoadName}` : ""}
          </p>
        )}

        {(status === "running" || status === "paused") && (
          <p className="mt-2 text-[10px] text-gray-500">
            목적지까지 {formatNavDistance(remainingM)}
            {status === "running" && speedMultiplier > 1
              ? ` · ${speedMultiplier}x`
              : ""}
          </p>
        )}

        {status === "ready" && route.averageSpeedKmh > 0 && (
          <p className="mt-2 text-[10px] text-gray-500">
            평균 {Math.round(route.averageSpeedKmh)} km/h
            {route.linkSegments.length > 0
              ? " · 구간별 속도·혼잡도 반영"
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
