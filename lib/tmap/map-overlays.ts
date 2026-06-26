import type { RouteResponse } from "./types";

const PAN_THROTTLE_MS = 400;
const VEHICLE_SIZE = 18;
const ENDPOINT_SIZE = 14;

export const MARKER_HTML = {
  start:
    `<div style="width:${ENDPOINT_SIZE}px;height:${ENDPOINT_SIZE}px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  end: `<div style="width:${ENDPOINT_SIZE}px;height:${ENDPOINT_SIZE}px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  vehicle:
    `<div style="width:${VEHICLE_SIZE}px;height:${VEHICLE_SIZE}px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
} as const;

function iconOffset(tmap: typeof Tmapv2, size: number) {
  const half = size / 2;
  return new tmap.Point(-half, -half);
}

/** polyline과 동일한 pathCoordinates의 양 끝 */
export function getRouteEndpoints(route: RouteResponse) {
  const path =
    route.pathCoordinates.length > 0
      ? route.pathCoordinates
      : route.coordinates;
  const [startLng, startLat] = path[0];
  const [endLng, endLat] = path[path.length - 1];
  return {
    start: { lng: startLng, lat: startLat },
    end: { lng: endLng, lat: endLat },
    path,
  };
}

export function focusMapOnRoute(
  map: Tmapv2.Map,
  tmap: typeof Tmapv2,
  route: RouteResponse
) {
  const { start } = getRouteEndpoints(route);
  map.setCenter(new tmap.LatLng(start.lat, start.lng));
  map.setZoom(13);
}

type OverlayRefs = {
  vehicle: Tmapv2.Marker | null;
  start: Tmapv2.Marker | null;
  end: Tmapv2.Marker | null;
  polyline: Tmapv2.Polyline | null;
};

export function clearOverlays(refs: OverlayRefs) {
  refs.vehicle?.setMap(null);
  refs.start?.setMap(null);
  refs.end?.setMap(null);
  refs.polyline?.setMap(null);
  refs.vehicle = null;
  refs.start = null;
  refs.end = null;
  refs.polyline = null;
}

export function drawRouteOverlays(
  map: Tmapv2.Map,
  tmap: typeof Tmapv2,
  route: RouteResponse,
  refs: OverlayRefs
) {
  clearOverlays(refs);

  const { path } = getRouteEndpoints(route);

  const latLngPath = path.map(([lng, lat]) => new tmap.LatLng(lat, lng));

  refs.start = new tmap.Marker({
    position: latLngPath[0],
    iconHTML: MARKER_HTML.start,
    map,
  });
  refs.end = new tmap.Marker({
    position: latLngPath[latLngPath.length - 1],
    iconHTML: MARKER_HTML.end,
    map,
  });

  try {
    refs.polyline = new tmap.Polyline({
      path: latLngPath,
      strokeColor: "#2563eb",
      strokeWeight: 4,
      map,
    });
  } catch (e) {
    console.warn("경로선 표시 생략:", e);
  }

  focusMapOnRoute(map, tmap, route);
}

export function clearVehicleMarker(refs: OverlayRefs) {
  refs.vehicle?.setMap(null);
  refs.vehicle = null;
}

export function updateVehicleMarker(
  map: Tmapv2.Map,
  tmap: typeof Tmapv2,
  pos: { lat: number; lng: number },
  refs: OverlayRefs,
  options: { followCamera: boolean; lastPanAt: { current: number } }
) {
  const latLng = new tmap.LatLng(pos.lat, pos.lng);

  if (!refs.vehicle) {
    refs.vehicle = new tmap.Marker({
      position: latLng,
      iconHTML: MARKER_HTML.vehicle,
      offset: iconOffset(tmap, VEHICLE_SIZE),
      map,
    });
  } else {
    refs.vehicle.setPosition(latLng);
  }

  if (!options.followCamera) return;

  const now = Date.now();
  if (now - options.lastPanAt.current < PAN_THROTTLE_MS) return;
  options.lastPanAt.current = now;
  map.setCenter(latLng);
}
