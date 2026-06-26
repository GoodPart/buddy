"use client";

import { useEffect, useRef, useState } from "react";
import { useSimulationStore } from "@/stores";
import { isTmapSdkReady, loadTmapSdk } from "@/lib/tmap/load-tmap-sdk";
import {
  clearOverlays,
  clearVehicleMarker,
  drawRouteOverlays,
  updateVehicleMarker,
} from "@/lib/tmap/map-overlays";

const JS_KEY = process.env.NEXT_PUBLIC_TMAP_JS_KEY;

type OverlayRefs = {
  vehicle: Tmapv2.Marker | null;
  start: Tmapv2.Marker | null;
  end: Tmapv2.Marker | null;
  polyline: Tmapv2.Polyline | null;
};

const emptyOverlays = (): OverlayRefs => ({
  vehicle: null,
  start: null,
  end: null,
  polyline: null,
});

export default function TmapCanvas() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Tmapv2.Map | null>(null);
  const overlaysRef = useRef<OverlayRefs>(emptyOverlays());
  const lastPanAtRef = useRef(0);
  const tmapRef = useRef<typeof Tmapv2 | null>(
    typeof window !== "undefined" && isTmapSdkReady() ? window.Tmapv2! : null
  );
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!JS_KEY) return;

    if (isTmapSdkReady()) {
      tmapRef.current = window.Tmapv2!;
      setReady(true);
      return;
    }

    let cancelled = false;
    loadTmapSdk(JS_KEY)
      .then((sdk) => {
        if (cancelled) return;
        tmapRef.current = sdk;
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "지도 로드 실패");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tmap = tmapRef.current;
    if (!ready || !tmap || !mapRef.current || mapInstance.current) return;

    mapInstance.current = new tmap.Map(mapRef.current, {
      center: new tmap.LatLng(37.5665, 126.978),
      width: "100%",
      height: "400px",
      zoom: 13,
      httpsMode: true,
    });

    return () => {
      clearOverlays(overlaysRef.current);
      overlaysRef.current = emptyOverlays();
      try {
        mapInstance.current?.destroy();
      } catch {
        /* ignore */
      }
      mapInstance.current = null;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const schedule = (fn: () => void) => {
      window.setTimeout(fn, 100);
    };

    const unsub = useSimulationStore.subscribe((state, prev) => {
      const map = mapInstance.current;
      const tmap = tmapRef.current;
      if (!map || !tmap) return;

      if (state.route !== prev.route) {
        schedule(() => {
          if (mapInstance.current !== map) return;
          if (!state.route) {
            clearOverlays(overlaysRef.current);
            overlaysRef.current = emptyOverlays();
            return;
          }
          try {
            drawRouteOverlays(map, tmap, state.route, overlaysRef.current);
          } catch (e) {
            console.warn("경로 표시 실패:", e);
          }
        });
        return;
      }

      const statusChanged = state.status !== prev.status;
      const posChanged = state.currentPosition !== prev.currentPosition;

      if (state.status === "idle" || state.status === "ready") {
        if (statusChanged) clearVehicleMarker(overlaysRef.current);
        return;
      }

      const active =
        state.route &&
        state.currentPosition &&
        (state.status === "running" ||
          state.status === "paused" ||
          state.status === "arrived");

      if (!active) return;
      if (!posChanged && !statusChanged) return;

      const pos = state.currentPosition;
      if (!pos) return;

      schedule(() => {
        if (mapInstance.current !== map) return;
        try {
          updateVehicleMarker(map, tmap, pos, overlaysRef.current, {
            followCamera: state.status === "running",
            lastPanAt: lastPanAtRef,
          });
        } catch (e) {
          console.warn("마커 업데이트 실패:", e);
        }
      });
    });

    return () => unsub();
  }, [ready]);

  if (!JS_KEY) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600 p-4 text-center">
        지도를 표시하려면 <code className="mx-1">NEXT_PUBLIC_TMAP_JS_KEY</code>를
        .env에 설정하세요.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 text-sm text-red-700 p-4 text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-md overflow-hidden border border-gray-300 bg-gray-100">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
