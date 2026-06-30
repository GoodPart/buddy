"use client";

import { useCallback, useEffect, useState } from "react";
import { useMapModeStore } from "@/stores";
import { findActiveMapCanvas } from "@/lib/vworld/map-canvas";
import {
  isVideoPipActive,
  isVideoPipSupported,
  startVideoPip,
  stopVideoPip,
} from "@/lib/vworld/video-pip";

type MapPipButtonProps = {
  disabled?: boolean;
};

export default function MapPipButton({ disabled = false }: MapPipButtonProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapMode = useMapModeStore((s) => s.mode);

  useEffect(() => {
    const sync = () => setActive(isVideoPipActive());
    document.addEventListener("enterpictureinpicture", sync);
    document.addEventListener("leavepictureinpicture", sync);
    sync();
    return () => {
      document.removeEventListener("enterpictureinpicture", sync);
      document.removeEventListener("leavepictureinpicture", sync);
    };
  }, []);

  useEffect(() => {
    if (isVideoPipActive()) {
      void stopVideoPip().then(() => setActive(false));
    }
  }, [mapMode]);

  const handleClick = useCallback(async () => {
    if (disabled || loading) return;
    setError("");

    if (active) {
      setLoading(true);
      try {
        await stopVideoPip();
        setActive(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "PiP를 종료하지 못했습니다.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const canvas = findActiveMapCanvas(mapMode);
      if (!canvas) {
        throw new Error("지도가 준비되지 않았습니다.");
      }
      await startVideoPip(canvas);
      setActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PiP를 시작하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [active, disabled, loading, mapMode]);

  if (!isVideoPipSupported()) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        className={`flex h-[34px] items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active
            ? "border-blue-400 bg-blue-900/90 text-blue-100 hover:bg-blue-800"
            : "border-gray-600 bg-gray-900/90 text-gray-200 hover:bg-gray-800 hover:text-white"
        }`}
        aria-label={active ? "PiP 종료" : "PiP로 보기"}
        aria-pressed={active}
        title={active ? "PiP 종료" : "다른 창 위에 지도 띄우기"}
      >
        <PipIcon active={active} />
        <span className="hidden sm:inline">
          {loading ? "…" : active ? "PiP 종료" : "PiP"}
        </span>
      </button>
      {error ? (
        <p className="max-w-[220px] rounded-md border border-red-500/40 bg-red-950/90 px-2 py-1 text-right text-[11px] leading-snug text-red-200 shadow">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PipIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <rect
        x="11"
        y="11"
        width="9"
        height="7"
        rx="1"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}
