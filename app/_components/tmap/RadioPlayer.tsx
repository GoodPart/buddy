"use client";

import { RADIO_STATIONS } from "@/lib/radio/stations";
import { useRadioStore } from "@/stores/radio-store";

export default function RadioPlayer() {
  const activeStationId = useRadioStore((s) => s.activeStationId);
  const loadingStationId = useRadioStore((s) => s.loadingStationId);
  const error = useRadioStore((s) => s.error);
  const toggleStation = useRadioStore((s) => s.toggleStation);
  const stop = useRadioStore((s) => s.stop);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-gray-300 p-4 bg-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-black">라디오</h2>
        {activeStationId ? (
          <button
            type="button"
            onClick={stop}
            className="text-xs text-gray-600 underline hover:text-gray-900"
          >
            정지
          </button>
        ) : null}
      </div>

      <p className="text-xs text-gray-500">
        주행 중 배경 라디오 · 다른 앱 화면으로 이동해도 재생 유지 · 스트림 제공{" "}
        <a
          href="https://radio.bsod.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          radio.bsod.kr
        </a>
      </p>

      <ul className="flex flex-wrap gap-2">
        {RADIO_STATIONS.map((station) => {
          const isActive = activeStationId === station.id;
          const isLoading = loadingStationId === station.id;

          return (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => void toggleStation(station)}
                disabled={loadingStationId != null && !isLoading}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-400 bg-white text-gray-800 hover:border-blue-500 hover:bg-blue-50"
                }`}
                aria-pressed={isActive}
              >
                {isLoading ? "연결 중…" : station.name}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
