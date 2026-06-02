import { create } from "zustand";

type UIState = {
    isSliderOpen : boolean;
    toggleSlider : () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSliderOpen : false,
    toggleSlider : () => set((state) => ({isSliderOpen : !state.isSliderOpen})),
}));