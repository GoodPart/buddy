"use client";

import type { PlacePreviewKind } from "@/stores/map-preview-store";
import { placePreviewLabel } from "@/stores/map-preview-store";
import type { Place } from "@/lib/tmap/types";

type Props = {
  kind: PlacePreviewKind;
  place: Place;
  onDismiss: () => void;
};

export default function PlacePreviewOverlay({ kind, place, onDismiss }: Props) {
  const label = placePreviewLabel(kind);

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 w-[min(320px,calc(100%-2rem))] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border border-white/15 bg-gray-950/90 px-4 py-3 shadow-xl backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
          {label} 확인
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{place.name}</p>
        {place.address ? (
          <p className="mt-0.5 truncate text-xs text-gray-400">{place.address}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-gray-500">
          주변을 천천히 둘러보고 위치를 확인해 주세요.
        </p>
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15"
          onClick={onDismiss}
        >
          확인 완료
        </button>
      </div>
    </div>
  );
}
