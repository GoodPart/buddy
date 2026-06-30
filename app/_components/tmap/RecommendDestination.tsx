"use client";

import { useState } from "react";
import { hasLbsConsent, setLbsConsent } from "@/lib/geolocation/lbs-consent";
import { useRoutePlannerStore, useSimulationStore } from "@/stores";
import LbsConsentDialog from "./LbsConsentDialog";

type RecommendedDestination = {
  name: string;
  address: string;
  time: string;
  distance: string;
};

const DESTINATIONS: RecommendedDestination[] = [
  {
    name: "광명동굴",
    address: "경기 광명시 가학로85번길 142",
    time: "44분",
    distance: "25km",
  },
  {
    name: "롯데월드",
    address: "서울 송파구 올림픽로 240",
    time: "34분",
    distance: "17km",
  },
  {
    name: "공덕역",
    address: "서울 마포구 마포대로 100",
    time: "7분",
    distance: "2.3km",
  }
];

export default function RecommendDestination() {
  const status = useSimulationStore((s) => s.status);
  const isLoading = useRoutePlannerStore((s) => s.isLoading);
  const error = useRoutePlannerStore((s) => s.error);
  const fetchRouteFromMyLocation = useRoutePlannerStore(
    (s) => s.fetchRouteFromMyLocation
  );
  const clearError = useRoutePlannerStore((s) => s.clearError);

  const [pending, setPending] = useState<RecommendedDestination | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  const isLocked = status === "running" || status === "paused";
  const disabled = isLoading || isLocked;

  const runSearch = async (destination: RecommendedDestination) => {
    clearError();
    await fetchRouteFromMyLocation(destination.name, destination.address);
  };

  const handleCardClick = (destination: RecommendedDestination) => {
    if (disabled) return;

    if (hasLbsConsent()) {
      void runSearch(destination);
      return;
    }

    setPending(destination);
    setShowConsent(true);
  };

  const handleConsent = (granted: boolean) => {
    setShowConsent(false);
    setLbsConsent(granted);

    const destination = pending;
    setPending(null);

    if (granted && destination) {
      void runSearch(destination);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-4">
        {DESTINATIONS.map((destination) => (
          <li key={destination.name} className="min-w-[200px] flex-1">
            <button
              type="button"
              onClick={() => handleCardClick(destination)}
              disabled={disabled}
              className="h-full w-full rounded-md border border-gray-600 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <h3 className="font-medium">{destination.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{destination.address}</p>
              <p className="mt-2 text-xs text-gray-500">
                약 {destination.time} · {destination.distance}
              </p>
              {isLoading ? (
                <p className="mt-2 text-xs text-blue-600">경로 탐색 중…</p>
              ) : (
                <p className="mt-2 text-xs text-blue-600">
                  탭하여 내 위치에서 경로 탐색
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {showConsent ? <LbsConsentDialog onConsent={handleConsent} /> : null}
    </section>
  );
}
