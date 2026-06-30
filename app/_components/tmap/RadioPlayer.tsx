"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RADIO_STATIONS } from "@/lib/radio/stations";
import { buildRadioStreamUrl } from "@/lib/radio/stream-url";
import { attachStreamToAudio } from "@/lib/radio/play-stream";
import type { RadioStation } from "@/lib/radio/types";

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRef = useRef<{ stop: () => void } | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const stopPlayback = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setActiveId(null);
  }, []);

  const playStation = useCallback(
    async (station: RadioStation) => {
      if (loadingId) return;

      if (activeId === station.id) {
        stopPlayback();
        return;
      }

      setError("");
      setLoadingId(station.id);
      stopPlayback();

      try {
        const audio = audioRef.current;
        if (!audio) throw new Error("오디오를 초기화하지 못했습니다.");

        const streamUrl = buildRadioStreamUrl(station);
        playbackRef.current = await attachStreamToAudio(audio, streamUrl);
        await audio.play();
        setActiveId(station.id);
      } catch (e) {
        stopPlayback();
        setError(
          e instanceof Error ? e.message : "라디오 재생에 실패했습니다."
        );
      } finally {
        setLoadingId(null);
      }
    },
    [activeId, loadingId, stopPlayback]
  );

  useEffect(() => {
    return () => {
      playbackRef.current?.stop();
    };
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-gray-300 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">라디오</h2>
        {activeId ? (
          <button
            type="button"
            onClick={stopPlayback}
            className="text-xs text-gray-600 underline hover:text-gray-900"
          >
            정지
          </button>
        ) : null}
      </div>

      <p className="text-xs text-gray-500">
        주행 중 배경 라디오 · 스트림 제공{" "}
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
          const isActive = activeId === station.id;
          const isLoading = loadingId === station.id;

          return (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => void playStation(station)}
                disabled={loadingId != null && !isLoading}
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

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" preload="none" />
    </section>
  );
}
