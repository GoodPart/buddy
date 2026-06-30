"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePosition } from "@/lib/tmap/types";
import {
  attachChaseCameraInput,
  cancelCameraFlight,
  DEFAULT_CHASE_OFFSETS,
  followCamera,
  resetChaseCameraOffsets,
  setCesiumCameraInputEnabled,
} from "@/lib/vworld/camera";
import type { ChaseCameraOffsets } from "@/lib/vworld/camera";
import { createMapController, getMap3D } from "@/lib/vworld/create-map";
import { loadVWorldSdk } from "@/lib/vworld/load-sdk";
import type { VWorldMapController, VWorldNamespace } from "@/lib/vworld/global.d";
import type { MapDisplayMode } from "@/lib/vworld/map-mode";
import { toVWorldMapMode } from "@/lib/vworld/map-mode";
import {
  VWorldRouteOverlay,
  enable3DBuildings,
} from "@/lib/vworld/route-overlay";
import { useMapModeStore, useSimulationStore } from "@/stores";
import MapModeToggle from "@/app/_components/tmap/MapModeToggle";
import RouteGuidanceOverlay from "@/app/_components/tmap/RouteGuidanceOverlay";
import "./vworld-map.css";

const MAP_CONTAINER_ID = "vworld-tmap-map";

function notifyMapResize(containerId: string): void {
  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
    const widget = document
      .getElementById(containerId)
      ?.querySelector(".cesium-widget") as
      | (HTMLElement & { cesiumWidget?: { resize?: () => void } })
      | null;
    widget?.cesiumWidget?.resize?.();
  });
}

function resetMapContainer(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }
}

type SimViewState = {
  vehiclePos: RoutePosition | null;
  followCamera: boolean;
  showVehicle: boolean;
  mapMode: MapDisplayMode;
};

function toSimViewState(
  status: string,
  pos: RoutePosition | null,
  mapMode: MapDisplayMode
): SimViewState {
  const showVehicle =
    pos != null &&
    (status === "running" || status === "paused" || status === "arrived");

  return {
    vehiclePos: pos,
    followCamera: status === "running",
    showVehicle,
    mapMode,
  };
}

export default function VWorldCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vwRef = useRef<VWorldNamespace | null>(null);
  const controllerRef = useRef<VWorldMapController | null>(null);
  const overlayRef = useRef(new VWorldRouteOverlay());
  const simRef = useRef<SimViewState>({
    vehiclePos: null,
    followCamera: false,
    showVehicle: false,
    mapMode: "3d",
  });
  const chaseOffsetsRef = useRef<ChaseCameraOffsets>({ ...DEFAULT_CHASE_OFFSETS });
  const mapMode = useMapModeStore((s) => s.mode);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialMode = useMapModeStore.getState().mode;

    loadVWorldSdk()
      .then(async (vw) => {
        if (cancelled) return;
        vwRef.current = vw;

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        if (!document.getElementById(MAP_CONTAINER_ID)) {
          throw new Error("지도 컨테이너가 준비되지 않았습니다.");
        }

        resetMapContainer(MAP_CONTAINER_ID);

        const controller = createMapController(MAP_CONTAINER_ID, initialMode);
        controllerRef.current = controller;
        simRef.current.mapMode = initialMode;

        notifyMapResize(MAP_CONTAINER_ID);
        setLoadError("");
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "VWorld 지도 로드 실패");
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
      const map3d = controllerRef.current ? getMap3D(controllerRef.current) : null;
      if (map3d) overlayRef.current.clear(map3d);
      controllerRef.current = null;
      vwRef.current = null;
      resetMapContainer(MAP_CONTAINER_ID);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = controllerRef.current;
    if (!controller) return;

    simRef.current.mapMode = mapMode;
    controller.setMode(toVWorldMapMode(mapMode));
  }, [mapMode, ready]);

  useEffect(() => {
    if (!ready) return;
    const root = containerRef.current;
    if (!root) return;

    return attachChaseCameraInput(root, chaseOffsetsRef.current, {
      enabled: () => {
        const status = useSimulationStore.getState().status;
        return status === "running" || status === "paused";
      },
      mapMode: () => simRef.current.mapMode,
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    let rafId = 0;
    const tick = () => {
      const vw = vwRef.current;
      const controller = controllerRef.current;
      const map3d = controller ? getMap3D(controller) : null;
      if (!vw || !map3d) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const { status, currentPosition } = useSimulationStore.getState();
      const mapMode = simRef.current.mapMode;

      if (
        (status === "running" || status === "paused") &&
        currentPosition
      ) {
        followCamera(
          vw,
          map3d,
          currentPosition,
          mapMode,
          chaseOffsetsRef.current
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const schedule = (fn: () => void) => {
      window.setTimeout(fn, 50);
    };

    const unsubSim = useSimulationStore.subscribe((state, prev) => {
      const vw = vwRef.current;
      const controller = controllerRef.current;
      const map3d = controller ? getMap3D(controller) : null;
      if (!vw || !map3d) return;

      simRef.current = toSimViewState(
        state.status,
        state.currentPosition,
        simRef.current.mapMode
      );

      const chaseActive =
        state.status === "running" || state.status === "paused";
      setCesiumCameraInputEnabled(!chaseActive);

      overlayRef.current.syncVehicle(
        vw,
        simRef.current.vehiclePos,
        simRef.current.showVehicle
      );

      if (state.status === "running" && prev.status !== "running") {
        cancelCameraFlight();
      }

      if (state.route !== prev.route && state.route) {
        resetChaseCameraOffsets(chaseOffsetsRef.current);
      }

      if (state.route !== prev.route) {
        schedule(() => {
          const v = vwRef.current;
          const c = controllerRef.current;
          const m = c ? getMap3D(c) : null;
          if (!v || !m) return;

          if (!state.route) {
            overlayRef.current.clear(m);
            simRef.current = {
              vehiclePos: null,
              followCamera: false,
              showVehicle: false,
              mapMode: simRef.current.mapMode,
            };
            return;
          }

          try {
            overlayRef.current.drawRoute(v, m, state.route);
            overlayRef.current.flyToRoute(v, m, state.route);
            if (simRef.current.mapMode === "3d") {
              enable3DBuildings(m);
            }
          } catch (e) {
            console.warn("경로 표시 실패:", e);
          }
        });
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      unsubSim();
    };
  }, [ready]);

  return (
    <div className="relative isolate w-full h-[400px] rounded-md overflow-hidden border border-gray-300 bg-gray-900 [contain:layout_paint]">
      <MapModeToggle />
      <RouteGuidanceOverlay />
      <div ref={containerRef} className="absolute inset-0 touch-none">
        <div id={MAP_CONTAINER_ID} className="h-full w-full [&_*]:box-border" />
      </div>
      {loadError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-950/80 p-4 text-center text-sm text-red-200">
          {loadError}
        </div>
      ) : null}
      {!ready && !loadError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/60 text-sm text-gray-300">
          지도 로딩 중…
        </div>
      ) : null}
    </div>
  );
}
