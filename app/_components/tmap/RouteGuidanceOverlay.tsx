"use client";

import { useSimulationStore } from "@/stores";
import { resolveGuidanceAtProgress } from "@/lib/tmap/guidance";

export default function RouteGuidanceOverlay() {
  const route = useSimulationStore((s) => s.route);
  const status = useSimulationStore((s) => s.status);
  const progress = useSimulationStore((s) => s.progress);
  const currentPosition = useSimulationStore((s) => s.currentPosition);

  if (!route || route.guidances.length === 0) return null;

  const { current: currentGuide, next: nextGuide } = resolveGuidanceAtProgress(
    route,
    progress
  );

  return (
    <div className="absolute bottom-2 left-2 right-14 z-10 pointer-events-none">
      <div className="max-w-sm rounded-md border border-blue-400/40 bg-gray-900/90 p-3 text-sm text-white shadow-lg backdrop-blur-sm pointer-events-auto opacity-70">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-300">
          현재 안내
        </p>
        {currentGuide ? (
          <>
            <p className="text-blue-50 leading-snug">
              <span className="mr-2 inline-block rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
                {currentGuide.turnLabel}
              </span>
              {currentGuide.description}
            </p>
            {nextGuide && status !== "arrived" && (
              <p className="mt-2 text-xs text-blue-200/90 leading-snug">
                다음: [{nextGuide.turnLabel}] {nextGuide.description}
              </p>
            )}
          </>
        ) : (
          <p className="text-blue-100">안내 정보 없음</p>
        )}
        {currentPosition && status !== "idle" && status !== "ready" && (
          <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-gray-400">
            {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
