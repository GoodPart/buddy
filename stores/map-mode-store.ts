import { create } from "zustand";
import type { MapDisplayMode } from "@/lib/vworld/map-mode";

type MapModeState = {
  mode: MapDisplayMode;
  setMode: (mode: MapDisplayMode) => void;
};

export const useMapModeStore = create<MapModeState>((set) => ({
  mode: "3d",
  setMode: (mode) => set({ mode }),
}));
