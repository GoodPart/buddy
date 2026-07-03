import { create } from "zustand";
import type { Place } from "@/lib/tmap/types";

export type PlacePreviewKind = "departure" | "destination";

type MapPreviewState = {
  active: boolean;
  kind: PlacePreviewKind | null;
  place: Place | null;
  sessionId: number;
  requestPreview: (kind: PlacePreviewKind, place: Place) => void;
  stopPreview: () => void;
};

let sessionCounter = 0;

export const useMapPreviewStore = create<MapPreviewState>((set) => ({
  active: false,
  kind: null,
  place: null,
  sessionId: 0,

  requestPreview: (kind, place) => {
    sessionCounter += 1;
    set({
      active: true,
      kind,
      place,
      sessionId: sessionCounter,
    });
  },

  stopPreview: () =>
    set({
      active: false,
      kind: null,
      place: null,
    }),
}));

export function placePreviewTtsMessage(kind: PlacePreviewKind): string {
  return kind === "departure"
    ? "출발지가 맞는지 확인해주세요"
    : "도착지가 맞는지 확인해주세요";
}

export function placePreviewLabel(kind: PlacePreviewKind): string {
  return kind === "departure" ? "출발지" : "도착지";
}
