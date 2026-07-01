import { create } from "zustand";

type UIState = {
    isSliderOpen : boolean;
    isNavigationOpen : boolean;
    isSmartphoneOpen : boolean;
    toggleSlider : () => void;
    toggleNavigation : () => void;
    toggleSmartphone : () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSliderOpen : false,
    isNavigationOpen : false,
    isSmartphoneOpen : false,
    toggleSlider : () => set((state) => ({isSliderOpen : !state.isSliderOpen})),
    toggleNavigation : () => set((state) => ({isNavigationOpen : !state.isNavigationOpen})),
    toggleSmartphone : () => set((state) => ({isSmartphoneOpen : !state.isSmartphoneOpen})),
}));