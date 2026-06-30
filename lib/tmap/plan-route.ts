import type { Place, RouteResponse } from "./types";

export async function geocodeAddress(query: string): Promise<Place[]> {
  const res = await fetch(
    `/api/tmap/geocode?q=${encodeURIComponent(query.trim())}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "주소 검색 실패");
  }
  return data.results ?? [];
}

export async function fetchTmapRoute(
  start: Place,
  end: Place
): Promise<RouteResponse> {
  const res = await fetch("/api/tmap/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startLng: start.lng,
      startLat: start.lat,
      endLng: end.lng,
      endLat: end.lat,
      startName: start.name,
      endName: end.name,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "경로 탐색 실패");
  }
  return data as RouteResponse;
}
