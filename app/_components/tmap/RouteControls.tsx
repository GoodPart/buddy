"use client";

import { isAtSignalStop, useSimulationStore } from "@/stores";
import { formatDistance, formatDuration } from "@/lib/tmap/format";
import { getRoutePathDistanceM } from "@/lib/tmap/guidance";
import { getAverageSpeedKmh, getSimSpeedKmh } from "@/lib/tmap/route-speed";

const SPEEDS = [1, 2, 5] as const;

const STATUS_LABEL: Record<string, string> = {
  idle: "대기",
  ready: "출발 대기",
  running: "주행 중",
  paused: "일시정지",
  arrived: "도착",
};

type RouteControlsProps = {
  overlay?: boolean;
};

export default function RouteControls({ overlay = false }: RouteControlsProps) {
  const status = useSimulationStore((s) => s.status);
  const progress = useSimulationStore((s) => s.progress);
  const route = useSimulationStore((s) => s.route);
  const departure = useSimulationStore((s) => s.departure);
  const destination = useSimulationStore((s) => s.destination);
  const speedMultiplier = useSimulationStore((s) => s.speedMultiplier);
  const start = useSimulationStore((s) => s.start);
  const pause = useSimulationStore((s) => s.pause);
  const resume = useSimulationStore((s) => s.resume);
  const reset = useSimulationStore((s) => s.reset);
  const setSpeedMultiplier = useSimulationStore((s) => s.setSpeedMultiplier);
  const signalStopRemainingMs = useSimulationStore(
    (s) => s.signalStopRemainingMs
  );

  if (!route) {
    if (overlay) return null;
    return (
      <p className="text-sm text-gray-500 p-4">
        출발지·도착지를 선택한 뒤 경로 탐색을 실행하세요.
      </p>
    );
  }

  const canControl = status !== "idle";
  const simulatedSec = route.totalTime * progress;
  const isRunning = status === "running" || status === "paused";
  const atSignal = isAtSignalStop({ status, signalStopRemainingMs });
  const traveledM = progress * getRoutePathDistanceM(route);
  const currentSpeedKmh =
    status === "running" && !atSignal
      ? getSimSpeedKmh(route, traveledM, speedMultiplier, status, atSignal)
      : 0;
  const avgSpeedKmh = Math.round(getAverageSpeedKmh(route));

  const statusLabel = atSignal
    ? "신호 대기"
    : STATUS_LABEL[status] ?? status;

  const panelClass = overlay
    ? "flex flex-col gap-3 rounded-md border border-gray-600/60 bg-gray-900/90 p-3 text-sm text-white shadow-lg backdrop-blur-sm"
    : "flex flex-col gap-4 p-4 border border-gray-300 rounded-md";

  const metaClass = overlay
    ? "flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-300"
    : "flex flex-wrap gap-4 text-sm";

  const progressTrackClass = overlay
    ? "w-full h-1.5 bg-gray-700 rounded-full overflow-hidden"
    : "w-full h-2 bg-gray-200 rounded-full overflow-hidden";

  const progressHintClass = overlay
    ? "text-[11px] text-gray-400"
    : "text-xs text-gray-500";

  const speedBtnClass = (active: boolean) =>
    overlay
      ? `px-2.5 py-1 rounded-md text-xs ${
          active
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        }`
      : `px-3 py-1 rounded-md text-sm ${
          active ? "bg-blue-600 text-white" : "bg-gray-200"
        }`;

  const content = (
    <section className={panelClass}>
      {overlay ? (
        <p className="text-xs font-medium uppercase tracking-wide text-blue-300">
          경로 주행
        </p>
      ) : null}

      <div className={metaClass}>
        <span>{departure?.name ?? "-"} → {destination?.name ?? "-"}</span>
        <span>{formatDistance(route.totalDistance)}</span>
        <span>{formatDuration(route.totalTime)}</span>
        <span>{statusLabel}</span>
        {status === "ready" && avgSpeedKmh > 0 ? (
          <span>평균 {avgSpeedKmh} km/h</span>
        ) : null}
        {isRunning && currentSpeedKmh > 0 ? (
          <span>{currentSpeedKmh} km/h</span>
        ) : null}
      </div>

      {isRunning && (
        <>
          <div className={progressTrackClass}>
            <div
              className="h-full bg-blue-500 transition-[width] duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className={progressHintClass}>
            {Math.round(progress * 100)}% · {formatDuration(simulatedSec)} /{" "}
            {formatDuration(route.totalTime)}
          </p>
        </>
      )}

      {/* {!overlay && route.guidances.length > 0 && (
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

      {overlay && route.guidances.length > 0 && (
        <details className="text-xs text-gray-300">
          <summary className="cursor-pointer font-medium text-gray-200">
            전체 안내 ({route.guidances.length})
          </summary>
          <ol className="mt-2 max-h-28 overflow-y-auto space-y-1.5 pl-4 list-decimal text-gray-300">
            {route.guidances.map((g) => (
              <li key={`${g.index}-${g.lng}-${g.lat}`}>
                <span className="text-[10px] text-gray-500 mr-1">
                  [{g.turnLabel}]
                </span>
                {g.description}
              </li>
            ))}
          </ol>
        </details>
      )} */}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={speedBtnClass(speedMultiplier === speed)}
              onClick={() => setSpeedMultiplier(speed)}
              disabled={status === "running"}
            >
              {speed}x
            </button>
          ))}
        </div>

        {status === "ready" && (
          <button
            type="button"
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
            onClick={start}
          >
            출발
          </button>
        )}
        {status === "running" && (
          <button
            type="button"
            className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-500"
            onClick={pause}
          >
            일시정지
          </button>
        )}
        {status === "paused" && (
          <button
            type="button"
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
            onClick={resume}
          >
            재개
          </button>
        )}
        {status === "arrived" && (
          <span className="text-xs font-medium text-green-400">도착</span>
        )}
        {canControl && (
          <button
            type="button"
            className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-500"
            onClick={reset}
          >
            초기화
          </button>
        )}
      </div>
    </section>
  );

  if (overlay) {
    return (
      <div className="absolute bottom-2 right-2 z-10 max-w-xs sm:max-w-sm pointer-events-auto">
        {content}
      </div>
    );
  }

  return content;
}
