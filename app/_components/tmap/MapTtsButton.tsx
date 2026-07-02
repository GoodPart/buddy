"use client";

import { useTtsStore } from "@/stores/tts-store";

type MapTtsButtonProps = {
  disabled?: boolean;
};

export default function MapTtsButton({ disabled = false }: MapTtsButtonProps) {
  const enabled = useTtsStore((s) => s.enabled);
  const speaking = useTtsStore((s) => s.speaking);
  const error = useTtsStore((s) => s.error);
  const toggleEnabled = useTtsStore((s) => s.toggleEnabled);
  const clearError = useTtsStore((s) => s.clearError);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          clearError();
          toggleEnabled();
        }}
        disabled={disabled}
        className={`flex h-[34px] items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? "border-emerald-400 bg-emerald-900/90 text-emerald-100 hover:bg-emerald-800"
            : "border-gray-600 bg-gray-900/90 text-gray-200 hover:bg-gray-800 hover:text-white"
        }`}
        aria-label={enabled ? "음성 안내 끄기" : "음성 안내 켜기"}
        aria-pressed={enabled}
        title={
          enabled
            ? "음성 안내 끄기"
            : "메인 HUD 안내 음성 (npm run tts:dev 필요)"
        }
      >
        <TtsIcon active={enabled} speaking={speaking} />
        <span className="hidden sm:inline">TTS</span>
      </button>
      {error ? (
        <p className="max-w-[220px] rounded-md border border-red-500/40 bg-red-950/90 px-2 py-1 text-right text-[11px] leading-snug text-red-200 shadow">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TtsIcon({ active, speaking }: { active: boolean; speaking: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 ${speaking ? "animate-pulse" : ""}`}
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        opacity={active ? 1 : 0.35}
      />
      <path
        d="M19.07 4.93a10 10 0 0 1 0 14.14"
        opacity={active ? 1 : 0.35}
      />
    </svg>
  );
}
