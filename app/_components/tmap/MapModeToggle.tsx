"use client";

import { useMapModeStore } from "@/stores";
import type { MapDisplayMode } from "@/lib/cesium/map-mode";
import { MAP_MODE_LABELS } from "@/lib/cesium/map-mode";
import { getCesiumIonTokenIssue } from "@/lib/cesium/setup";

const MODES: MapDisplayMode[] = ["2d", "3d"];

export default function MapModeToggle() {
  const mode = useMapModeStore((s) => s.mode);
  const setMode = useMapModeStore((s) => s.setMode);
  const ionIssue = getCesiumIonTokenIssue();

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
      <div
        className="flex rounded-md border border-gray-600 bg-gray-900/90 p-0.5 shadow-lg"
        role="group"
        aria-label="지도 표시 모드"
      >
        {MODES.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
              aria-pressed={active}
            >
              {MAP_MODE_LABELS[m]}
            </button>
          );
        })}
      </div>
      {mode === "3d" && ionIssue && (
        <p className="max-w-[220px] rounded bg-amber-950/90 px-2 py-1 text-right text-[10px] leading-snug text-amber-200">
          {ionIssue}
        </p>
      )}
    </div>
  );
}
