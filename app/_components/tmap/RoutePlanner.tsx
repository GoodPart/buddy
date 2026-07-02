"use client";

import { useRoutePlannerStore, useSimulationStore } from "@/stores";
import { geocodeAddress } from "@/lib/tmap/plan-route";
import PlaceSearch from "./PlaceSearch";

export default function RoutePlanner() {
  const status = useSimulationStore((s) => s.status);
  const {
    startQuery,
    endQuery,
    startPlace,
    endPlace,
    isLoading,
    error,
    setStartQuery,
    setEndQuery,
    setStartPlace,
    setEndPlace,
    fetchRoute,
  } = useRoutePlannerStore();

  const isLocked = status === "running" || status === "paused";

  return (
    <section className="flex flex-col gap-3 text-black mt-5">
      <h2 className="font-semibold">경로 설정</h2>
      <PlaceSearch
        label="출발지"
        query={startQuery}
        onQueryChange={setStartQuery}
        selected={startPlace}
        onSelect={setStartPlace}
        geocode={geocodeAddress}
      />
      <PlaceSearch
        label="도착지"
        query={endQuery}
        onQueryChange={setEndQuery}
        selected={endPlace}
        onSelect={setEndPlace}
        geocode={geocodeAddress}
      />
      <button
        type="button"
        className="bg-blue-600 text-white py-2 rounded-md disabled:opacity-50 text-[12px] font-bold"
        onClick={() => void fetchRoute()}
        disabled={isLoading || isLocked}
      >
        {isLoading ? "경로 탐색 중..." : "경로 탐색"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
