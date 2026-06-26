"use client";

import { useSimulationStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/tmap/format";
import { resolveGuidanceAtProgress } from "@/lib/tmap/guidance";

const SPEEDS = [1, 2, 5] as const;

export default function RouteControls() {
  const status = useSimulationStore((s) => s.status);
  const progress = useSimulationStore((s) => s.progress);
  const route = useSimulationStore((s) => s.route);
  const departure = useSimulationStore((s) => s.departure);
  const destination = useSimulationStore((s) => s.destination);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const currentPosition = useSimulationStore((s) => s.currentPosition);
  const start = useSimulationStore((s) => s.start);
  const pause = useSimulationStore((s) => s.pause);
  const resume = useSimulationStore((s) => s.resume);
  const reset = useSimulationStore((s) => s.reset);
  const setSpeedMultiplier = useSimulationStore((s) => s.setSpeedMultiplier);

  if (!route) {
    return (
      <p className="text-sm text-gray-500 p-4">
        출발지·도착지를 선택한 뒤 경로 탐색을 실행하세요.
      </p>
    );
  }

  const canControl = status !== "idle";
  const simulatedSec = route.totalTime * progress;
  const { current: currentGuide, next: nextGuide } = resolveGuidanceAtProgress(
    route,
    progress
  );

  return (
    <section className="flex flex-col gap-4 p-4 border border-gray-300 rounded-md">
      <div className="flex flex-wrap gap-4 text-sm">
        <span>출발: {departure?.name ?? "-"}</span>
        <span>도착: {destination?.name ?? "-"}</span>
        <span>거리: {formatDistance(route.totalDistance)}</span>
        <span>예상: {formatDuration(route.totalTime)}</span>
        <span>상태: {status}</span>
      </div>

      {route.guidances.length > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
          <p className="font-medium text-blue-900 mb-1">현재 안내</p>
          {currentGuide ? (
            <>
              <p className="text-blue-800">
                <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 text-xs font-medium">
                  {currentGuide.turnLabel}
                </span>
                {currentGuide.description}
              </p>
              {nextGuide && status !== "arrived" && (
                <p className="text-xs text-blue-700 mt-2">
                  다음: [{nextGuide.turnLabel}] {nextGuide.description}
                </p>
              )}
            </>
          ) : (
            <p className="text-blue-800">안내 정보 없음</p>
          )}
        </div>
      )}

      {currentPosition && (
        <p className="text-sm text-gray-600">
          현재 위치: {currentPosition.lat.toFixed(5)},{" "}
          {currentPosition.lng.toFixed(5)}
        </p>
      )}

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        진행 {Math.round(progress * 100)}% · 시뮬{" "}
        {formatDuration(simulatedSec)} / {formatDuration(route.totalTime)}
      </p>

      {route.guidances.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-700 font-medium">
            전체 경로 안내 ({route.guidances.length}개)
          </summary>
          <ol className="mt-2 max-h-48 overflow-y-auto space-y-2 pl-4 list-decimal text-gray-700">
            {route.guidances.map((g) => (
              <li key={`${g.index}-${g.lng}-${g.lat}`}>
                <span className="text-xs font-medium text-gray-500 mr-1">
                  [{g.turnLabel}]
                </span>
                {g.name ? `${g.name} · ` : ""}
                {g.description}
                {g.nextRoadName ? (
                  <span className="text-xs text-gray-500">
                    {" "}
                    → {g.nextRoadName}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="flex gap-2">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`px-3 py-1 rounded-md text-sm ${
              speedMultiplier === speed
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
            onClick={() => setSpeedMultiplier(speed)}
            disabled={status === "running"}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {status === "ready" && (
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded-md"
            onClick={start}
          >
            출발
          </button>
        )}
        {status === "running" && (
          <button
            type="button"
            className="bg-yellow-600 text-white px-4 py-2 rounded-md"
            onClick={pause}
          >
            일시정지
          </button>
        )}
        {status === "paused" && (
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded-md"
            onClick={resume}
          >
            재개
          </button>
        )}
        {status === "arrived" && (
          <p className="text-green-700 font-medium self-center">도착했습니다.</p>
        )}
        {canControl && (
          <button
            type="button"
            className="bg-gray-500 text-white px-4 py-2 rounded-md"
            onClick={reset}
          >
            초기화
          </button>
        )}
      </div>
    </section>
  );
}
