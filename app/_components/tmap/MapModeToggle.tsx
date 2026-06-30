"use client";

import { useMapModeStore } from "@/stores";
import type { MapDisplayMode } from "@/lib/vworld/map-mode";
import { MAP_MODE_LABELS } from "@/lib/vworld/map-mode";

const MODES: MapDisplayMode[] = ["2d", "3d"];

export default function MapModeToggle() {
  const mode = useMapModeStore((s) => s.mode);
  const setMode = useMapModeStore((s) => s.setMode);

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
    </div>
  );
}
