import { buildRadioStreamUrl } from "./stream-url";
import { attachStreamToAudio, type StreamPlayback } from "./play-stream";
import type { RadioStation } from "./types";

let audioEl: HTMLAudioElement | null = null;
let playback: StreamPlayback | null = null;

export function bindRadioAudioElement(el: HTMLAudioElement | null): void {
  audioEl = el;
}

export function stopRadioEngine(): void {
  playback?.stop();
  playback = null;
}

export async function playRadioStation(station: RadioStation): Promise<void> {
  if (!audioEl) {
    throw new Error("라디오 오디오가 아직 준비되지 않았습니다.");
  }

  stopRadioEngine();

  const streamUrl = buildRadioStreamUrl(station);
  playback = await attachStreamToAudio(audioEl, streamUrl);
  await audioEl.play();
}
