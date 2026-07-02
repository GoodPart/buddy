import { create } from "zustand";
import { playRadioStation, stopRadioEngine } from "@/lib/radio/radio-engine";
import type { RadioStation } from "@/lib/radio/types";

type RadioState = {
  activeStationId: string | null;
  loadingStationId: string | null;
  error: string;

  playStation: (station: RadioStation) => Promise<void>;
  stop: () => void;
  toggleStation: (station: RadioStation) => Promise<void>;
  clearError: () => void;
};

export const useRadioStore = create<RadioState>((set, get) => ({
  activeStationId: null,
  loadingStationId: null,
  error: "",

  clearError: () => set({ error: "" }),

  stop: () => {
    stopRadioEngine();
    set({ activeStationId: null, loadingStationId: null });
  },

  playStation: async (station) => {
    if (get().loadingStationId) return;

    set({ error: "", loadingStationId: station.id });
    try {
      await playRadioStation(station);
      set({ activeStationId: station.id, loadingStationId: null });
    } catch (e) {
      stopRadioEngine();
      set({
        activeStationId: null,
        loadingStationId: null,
        error: e instanceof Error ? e.message : "라디오 재생에 실패했습니다.",
      });
    }
  },

  toggleStation: async (station) => {
    if (get().activeStationId === station.id) {
      get().stop();
      return;
    }
    await get().playStation(station);
  },
}));
