"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  createMapController,
  getMap2D,
  getMap3D,
  panToLocation,
  refresh2DMap,
  resizeMaps,
} from "@/lib/vworld/create-map";
import { loadVWorldSdk } from "@/lib/vworld/load-sdk";
import type { VWorldMapController, VWorldNamespace } from "@/lib/vworld/global.d";
import type { MapDisplayMode } from "@/lib/vworld/map-mode";
import { toVWorldMapMode } from "@/lib/vworld/map-mode";
import { MyLocationOverlay } from "@/lib/vworld/my-location-overlay";
import {
  routeDisplayModeFromStatus,
  VWorldRouteOverlay,
} from "@/lib/vworld/route-overlay";
import { useMapModeStore, useSimulationStore, useMapPreviewStore } from "@/stores";
import { getRoutePathDistanceM } from "@/lib/tmap/guidance";
import { installSurfaceProbeDebugTools, registerVehiclePositionProvider } from "@/lib/vworld/surface-probe-debug";
import { drivingSurfaceHeight } from "@/lib/vworld/surface-probe";
import MapToolbar from "@/app/_components/tmap/MapToolbar";
import RouteGuidanceOverlay from "@/app/_components/tmap/RouteGuidanceOverlay";
import RouteControls from "@/app/_components/tmap/RouteControls";
import RadioAudioHost from "@/app/_components/tmap/RadioAudioHost";
import NavTtsHost from "@/app/_components/tmap/NavTtsHost";
import PlacePreviewHost from "@/app/_components/tmap/PlacePreviewHost";
import "./vworld-map.css";
import SmartphoneOverlay from "./SmartphoneOverlay";

const MAP_CONTAINER_ID = "vworld-tmap-map";

function resetMapContainer(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }
}

function drawRouteOnMap(
  vw: VWorldNamespace,
  controller: VWorldMapController,
  overlay: VWorldRouteOverlay,
  mapMode: MapDisplayMode
) {
  const { route, status } = useSimulationStore.getState();
  const map3d = getMap3D(controller);
  const map2d = getMap2D(controller);
  if (!route) return;
  if (mapMode === "3d" && !map3d) return;
  if (mapMode === "2d" && !map2d) return;

  const displayMode = routeDisplayModeFromStatus(status);

  try {
    overlay.flyToRoute(vw, map3d!, map2d, route, mapMode);
    overlay.drawRoute(vw, map3d!, map2d, route, mapMode, displayMode);
  } catch (e) {
    console.warn("경로 표시 실패:", e);
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
    (status === "ready" ||
      status === "running" ||
      status === "paused" ||
      status === "arrived");

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
  const myLocationOverlayRef = useRef(new MyLocationOverlay());
  const myLocationRef = useRef<{ lng: number; lat: number } | null>(null);
  const simRef = useRef<SimViewState>({
    vehiclePos: null,
    followCamera: false,
    showVehicle: false,
    mapMode: "3d",
  });
  const chaseOffsetsRef = useRef<ChaseCameraOffsets>({ ...DEFAULT_CHASE_OFFSETS });
  const frameIdRef = useRef(0);
  const mapMode = useMapModeStore((s) => s.mode);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  const syncMyLocationMarker = useCallback(() => {
    const pos = myLocationRef.current;
    const vw = vwRef.current;
    const controller = controllerRef.current;
    if (!pos || !vw || !controller) return;

    const map2d = getMap2D(controller);
    myLocationOverlayRef.current.sync(
      vw,
      map2d,
      pos.lng,
      pos.lat,
      simRef.current.mapMode
    );
  }, []);

  const handleMyLocation = useCallback(
    (lng: number, lat: number) => {
      const controller = controllerRef.current;
      if (!controller) return;

      useMapPreviewStore.getState().stopPreview();
      myLocationRef.current = { lng, lat };
      const mode = useMapModeStore.getState().mode;
      panToLocation(controller, mode, lng, lat);
      syncMyLocationMarker();
    },
    [syncMyLocationMarker]
  );

  const getPreviewRuntime = useCallback(
    () => ({
      vw: vwRef.current,
      controller: controllerRef.current,
    }),
    []
  );

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

        resizeMaps(controller, initialMode);
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
      const controller = controllerRef.current;
      const map3d = controller ? getMap3D(controller) : null;
      const map2d = controller ? getMap2D(controller) : null;
      overlayRef.current.clear(map3d, map2d, simRef.current.mapMode);
      myLocationOverlayRef.current.clear(map2d);
      myLocationRef.current = null;
      controllerRef.current = null;
      vwRef.current = null;
      resetMapContainer(MAP_CONTAINER_ID);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = controllerRef.current;
    const vw = vwRef.current;
    if (!controller || !vw) return;

    simRef.current.mapMode = mapMode;
    controller.setMode(toVWorldMapMode(mapMode));

    if (mapMode === "2d") {
      useMapPreviewStore.getState().stopPreview();
    }

    window.setTimeout(() => {
      resizeMaps(controller, mapMode);
      if (mapMode === "2d") {
        refresh2DMap(controller);
      }

      if (useSimulationStore.getState().route) {
        drawRouteOnMap(vw, controller, overlayRef.current, mapMode);

        const { status, currentPosition, progress, route } =
          useSimulationStore.getState();
        const map2d = getMap2D(controller);
        const traveledM = route ? progress * getRoutePathDistanceM(route) : 0;
        overlayRef.current.syncVehicle(
          vw,
          map2d,
          currentPosition,
          status === "running" || status === "paused" || status === "arrived",
          mapMode,
          traveledM
        );
      }

      syncMyLocationMarker();
    }, 200);
  }, [mapMode, ready, syncMyLocationMarker]);

  useEffect(() => {
    if (!ready) return;
    installSurfaceProbeDebugTools();
    registerVehiclePositionProvider(() => {
      const { currentPosition, route, progress } = useSimulationStore.getState();
      if (!currentPosition) return null;
      const traveledM = route ? progress * getRoutePathDistanceM(route) : 0;
      return { ...currentPosition, traveledM };
    });
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
      frameIdRef.current += 1;
      const frameId = frameIdRef.current;
      const vw = vwRef.current;
      const controller = controllerRef.current;
      const map3d = controller ? getMap3D(controller) : null;
      const map2d = controller ? getMap2D(controller) : null;
      if (!vw || !controller) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (simRef.current.mapMode === "3d" && !map3d) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (simRef.current.mapMode === "2d" && !map2d) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const { status, currentPosition, progress, route } =
        useSimulationStore.getState();
      const currentMode = simRef.current.mapMode;

      const showVehicle =
        currentPosition != null &&
        (status === "ready" ||
          status === "running" ||
          status === "paused" ||
          status === "arrived");

      const traveledM = route ? progress * getRoutePathDistanceM(route) : 0;

      let surfaceState = null;
      if (showVehicle && currentPosition) {
        surfaceState = drivingSurfaceHeight.updateFrameState(
          currentPosition.lng,
          currentPosition.lat,
          traveledM,
          frameId
        );
      }

      overlayRef.current.syncVehicle(
        vw,
        map2d,
        showVehicle ? currentPosition : null,
        showVehicle,
        currentMode,
        traveledM,
        surfaceState
      );

      if ((status === "running" || status === "paused") && currentPosition) {
        if (currentMode === "2d" && map2d) {
          followCamera(
            vw,
            map3d ?? ({} as NonNullable<typeof map3d>),
            map2d,
            currentPosition,
            currentMode,
            chaseOffsetsRef.current,
            traveledM,
            surfaceState
          );
        } else if (map3d) {
          followCamera(
            vw,
            map3d,
            map2d,
            currentPosition,
            currentMode,
            chaseOffsetsRef.current,
            traveledM,
            surfaceState
          );
        }
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
      const map2d = controller ? getMap2D(controller) : null;
      if (!vw || !controller) return;

      simRef.current = toSimViewState(
        state.status,
        state.currentPosition,
        simRef.current.mapMode
      );

      const chaseActive =
        state.status === "running" || state.status === "paused";
      setCesiumCameraInputEnabled(
        simRef.current.mapMode === "3d" && !chaseActive
      );

      if (state.status === "running" && prev.status !== "running") {
        cancelCameraFlight();
      }

      if (
        state.route &&
        simRef.current.mapMode === "3d" &&
        state.status !== prev.status
      ) {
        overlayRef.current.setRouteDisplayMode(
          vw,
          state.route,
          routeDisplayModeFromStatus(state.status)
        );
      }

      if (state.route !== prev.route && state.route) {
        resetChaseCameraOffsets(chaseOffsetsRef.current);
      }

      if (state.route !== prev.route) {
        schedule(() => {
          const v = vwRef.current;
          const c = controllerRef.current;
          const m3d = c ? getMap3D(c) : null;
          const m2d = c ? getMap2D(c) : null;
          if (!v) return;

          if (!state.route) {
            overlayRef.current.clear(m3d, m2d, simRef.current.mapMode);
            simRef.current = {
              vehiclePos: null,
              followCamera: false,
              showVehicle: false,
              mapMode: simRef.current.mapMode,
            };
            syncMyLocationMarker();
            return;
          }

          try {
            if (simRef.current.mapMode === "3d" && !m3d) return;
            if (simRef.current.mapMode === "2d" && !m2d) return;

            overlayRef.current.flyToRoute(
              v,
              m3d!,
              m2d,
              state.route,
              simRef.current.mapMode
            );
            overlayRef.current.drawRoute(
              v,
              m3d!,
              m2d,
              state.route,
              simRef.current.mapMode,
              routeDisplayModeFromStatus(state.status)
            );
            syncMyLocationMarker();
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
  }, [ready, syncMyLocationMarker]);

  return (
    <div className="relative isolate w-full min-h-[calc(100vh)] h-[500px] overflow-hidden bg-gray-900 [contain:layout_paint]">
      <MapToolbar mapReady={ready} onLocated={handleMyLocation} />
      <RouteControls overlay />
      <RouteGuidanceOverlay />
      <SmartphoneOverlay />
      <RadioAudioHost />
      <NavTtsHost />
      <PlacePreviewHost ready={ready} getRuntime={getPreviewRuntime} />
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
