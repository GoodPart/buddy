"use client";

import { useState } from "react";
import { useSimulationStore } from "@/stores";
import type { Place, RouteResponse } from "@/lib/tmap/types";
import PlaceSearch from "./PlaceSearch";

export default function RoutePlanner() {
  const { setDeparture, setDestination, setRoute, status } = useSimulationStore();

  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startPlace, setStartPlace] = useState<Place | null>(null);
  const [endPlace, setEndPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchRoute = async () => {
    if (!startPlace || !endPlace) {
      setError("출발지와 도착지를 모두 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tmap/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLng: startPlace.lng,
          startLat: startPlace.lat,
          endLng: endPlace.lng,
          endLat: endPlace.lat,
          startName: startPlace.name,
          endName: endPlace.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "경로 탐색 실패");
      }

      setDeparture(startPlace);
      setDestination(endPlace);
      setRoute(data as RouteResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "경로 탐색 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = status === "running" || status === "paused";

  return (
    <section className="flex flex-col gap-4 p-4 border border-gray-300 rounded-md">
      <h2 className="font-semibold">경로 설정</h2>
      <PlaceSearch
        label="출발지"
        query={startQuery}
        onQueryChange={setStartQuery}
        selected={startPlace}
        onSelect={setStartPlace}
      />
      <PlaceSearch
        label="도착지"
        query={endQuery}
        onQueryChange={setEndQuery}
        selected={endPlace}
        onSelect={setEndPlace}
      />
      <button
        type="button"
        className="bg-blue-600 text-white py-2 rounded-md disabled:opacity-50"
        onClick={handleFetchRoute}
        disabled={isLoading || isLocked}
      >
        {isLoading ? "경로 탐색 중..." : "경로 탐색"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
