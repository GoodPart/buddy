import { create } from "zustand";

type UIState = {
    isSliderOpen : boolean;
    isNavigationOpen : boolean;
    isSmartphoneOpen : boolean;
    currentScreen : "main" | "map" | "radio";
    toggleSlider : () => void;
    toggleNavigation : () => void;
    toggleSmartphone : () => void;
    setCurrentScreen : (screen : "main" | "map" | "radio") => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSliderOpen : false,
    isNavigationOpen : false,
    isSmartphoneOpen : false,
    currentScreen : "main",
    toggleSlider : () => set((state) => ({isSliderOpen : !state.isSliderOpen})),
    toggleNavigation : () => set((state) => ({isNavigationOpen : !state.isNavigationOpen})),
    toggleSmartphone : () => set((state) => ({isSmartphoneOpen : !state.isSmartphoneOpen})),
    setCurrentScreen : (screen : "main" | "map" | "radio") => set((state) => ({currentScreen : screen})),
}));