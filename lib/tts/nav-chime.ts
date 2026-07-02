let audioContext: AudioContext | null = null;
let activeChimeNodes: OscillatorNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  peakGain: number
): Promise<void> {
  return new Promise((resolve) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    activeChimeNodes.push(osc);
    osc.onended = () => {
      activeChimeNodes = activeChimeNodes.filter((node) => node !== osc);
      resolve();
    };
    osc.start(start);
    osc.stop(start + durationSec);
  });
}

/** 네비 안내 직전 짧은 알림음 (2음 딩) */
export async function playNavChime(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (signal?.aborted) return;

  await playTone(ctx, 880, 0.1, 0.22);
  if (signal?.aborted) return;
  await playTone(ctx, 1318.5, 0.14, 0.18);
}

export function stopNavChime(): void {
  for (const node of activeChimeNodes) {
    try {
      node.stop();
    } catch {
      // already stopped
    }
  }
  activeChimeNodes = [];
}

export function delayMs(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      resolve();
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
