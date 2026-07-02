"use client";

import { useEffect, useRef } from "react";
import { bindRadioAudioElement } from "@/lib/radio/radio-engine";

/**
 * 전역 라디오 `<audio>` — 화면·스마트폰 UI와 무관하게 1회 마운트.
 * 재생 상태는 useRadioStore.
 */
export default function RadioAudioHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bindRadioAudioElement(audioRef.current);
    return () => bindRadioAudioElement(null);
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} className="hidden" preload="none" aria-hidden />
  );
}
