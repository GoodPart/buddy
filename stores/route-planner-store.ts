import { create } from "zustand";
import { getCurrentGeoPosition } from "@/lib/geolocation/get-current-position";
import {
  fetchTmapRoute,
  geocodeAddress,
} from "@/lib/tmap/plan-route";
import type { Place } from "@/lib/tmap/types";
import { useSimulationStore } from "./simulation-store";

type RoutePlannerState = {
  startQuery: string;
  endQuery: string;
  startPlace: Place | null;
  endPlace: Place | null;
  isLoading: boolean;
  error: string;

  setStartQuery: (q: string) => void;
  setEndQuery: (q: string) => void;
  setStartPlace: (p: Place | null) => void;
  setEndPlace: (p: Place | null) => void;
  clearError: () => void;
  fetchRoute: () => Promise<void>;
  fetchRouteFromMyLocation: (
    destinationName: string,
    destinationAddress: string
  ) => Promise<void>;
};

export const useRoutePlannerStore = create<RoutePlannerState>((set, get) => ({
  startQuery: "",
  endQuery: "",
  startPlace: null,
  endPlace: null,
  isLoading: false,
  error: "",

  setStartQuery: (startQuery) => set({ startQuery }),
  setEndQuery: (endQuery) => set({ endQuery }),
  setStartPlace: (startPlace) => set({ startPlace }),
  setEndPlace: (endPlace) => set({ endPlace }),
  clearError: () => set({ error: "" }),

  fetchRoute: async () => {
    const { startPlace, endPlace } = get();
    if (!startPlace || !endPlace) {
      set({ error: "출발지와 도착지를 모두 선택해 주세요." });
      return;
    }

    set({ isLoading: true, error: "" });

    try {
      const route = await fetchTmapRoute(startPlace, endPlace);
      const sim = useSimulationStore.getState();
      sim.setDeparture(startPlace);
      sim.setDestination(endPlace);
      sim.setRoute(route);
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "경로 탐색 실패",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRouteFromMyLocation: async (destinationName, destinationAddress) => {
    set({ isLoading: true, error: "" });

    try {
      const pos = await getCurrentGeoPosition();
      const startPlace: Place = {
        name: "내 위치",
        lng: pos.lng,
        lat: pos.lat,
      };

      const results = await geocodeAddress(destinationAddress);
      if (results.length === 0) {
        throw new Error("도착지 주소를 찾을 수 없습니다.");
      }

      const endPlace: Place = {
        ...results[0],
        name: destinationName,
        address: destinationAddress,
      };

      const route = await fetchTmapRoute(startPlace, endPlace);

      set({
        startQuery: "내 위치",
        endQuery: destinationAddress,
        startPlace,
        endPlace,
      });

      const sim = useSimulationStore.getState();
      sim.setDeparture(startPlace);
      sim.setDestination(endPlace);
      sim.setRoute(route);
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "경로 탐색 실패",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
