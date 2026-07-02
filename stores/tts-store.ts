import { create } from "zustand";
import { speakNavText, stopTtsEngine } from "@/lib/tts/tts-engine";

type TtsState = {
  enabled: boolean;
  speaking: boolean;
  lastUtterance: string;
  error: string;

  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  clearError: () => void;
  speak: (text: string) => Promise<void>;
  stop: () => void;
};

export const useTtsStore = create<TtsState>((set, get) => ({
  enabled: false,
  speaking: false,
  lastUtterance: "",
  error: "",

  clearError: () => set({ error: "" }),

  setEnabled: (enabled) => {
    if (!enabled) {
      stopTtsEngine();
      set({ enabled: false, speaking: false });
      return;
    }
    set({ enabled: true, error: "" });
  },

  toggleEnabled: () => {
    get().setEnabled(!get().enabled);
  },

  stop: () => {
    stopTtsEngine();
    set({ speaking: false });
  },

  speak: async (text) => {
    if (!get().enabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    set({ speaking: true, error: "", lastUtterance: trimmed });
    try {
      await speakNavText(trimmed);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      set({
        error: e instanceof Error ? e.message : "TTS 재생에 실패했습니다.",
        lastUtterance: "",
      });
    } finally {
      set({ speaking: false });
    }
  },
}));
