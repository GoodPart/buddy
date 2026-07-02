import { delayMs, playNavChime, stopNavChime } from "@/lib/tts/nav-chime";

let audioEl: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let abortController: AbortController | null = null;
let playbackDone: (() => void) | null = null;

/** MeloTTS 합성 속도 — 기본 대비 20% 빠르게 */
const NAV_TTS_SPEED = 1.2;
/** 알림음 종료 후 안내까지 대기 (ms) */
const CHIME_TO_TTS_DELAY_MS = 500;

export function bindTtsAudioElement(el: HTMLAudioElement | null): void {
  audioEl = el;
}

export function stopTtsEngine(): void {
  abortController?.abort();
  abortController = null;
  stopNavChime();
  playbackDone?.();
  playbackDone = null;
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

async function fetchTtsBlob(
  text: string,
  signal: AbortSignal
): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: NAV_TTS_SPEED }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `TTS 요청 실패 (${res.status})`);
  }

  return res.blob();
}

async function playAudioBlob(
  el: HTMLAudioElement,
  blob: Blob,
  signal: AbortSignal
): Promise<void> {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrl = URL.createObjectURL(blob);
  el.src = objectUrl;

  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const finish = () => {
      if (playbackDone !== finish) return;
      playbackDone = null;
      cleanup();
      resolve();
    };

    playbackDone = finish;

    const cleanup = () => {
      el.removeEventListener("ended", finish);
      el.removeEventListener("error", finish);
      signal.removeEventListener("abort", finish);
    };

    el.addEventListener("ended", finish);
    el.addEventListener("error", finish);
    signal.addEventListener("abort", finish);
    el.play().catch(finish);
  });
}

export async function speakNavText(text: string): Promise<void> {
  if (!audioEl) {
    throw new Error("TTS 오디오가 아직 준비되지 않았습니다.");
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  stopTtsEngine();

  const controller = new AbortController();
  abortController = controller;
  const { signal } = controller;

  // 알림음·대기 구간에 TTS 합성을 병렬로 시작
  const ttsPromise = fetchTtsBlob(trimmed, signal);

  await playNavChime(signal);
  if (signal.aborted) return;

  await delayMs(CHIME_TO_TTS_DELAY_MS, signal);
  if (signal.aborted) return;

  const blob = await ttsPromise;
  if (signal.aborted) return;

  await playAudioBlob(audioEl, blob, signal);
}
