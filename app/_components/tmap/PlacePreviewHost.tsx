"use client";

import { useEffect, useRef } from "react";
import {
  cancelCameraFlight,
  setCesiumCameraInputEnabled,
} from "@/lib/vworld/camera";
import { getMap3D } from "@/lib/vworld/create-map";
import type { VWorldMapController, VWorldNamespace } from "@/lib/vworld/global.d";
import {
  advancePlacePreviewOrbit,
  applyPlacePreviewOrbit,
  flyToPlacePreview,
  type PlacePreviewOrbitState,
} from "@/lib/vworld/place-preview-camera";
import { PlacePreviewMarkerOverlay } from "@/lib/vworld/place-preview-marker";
import {
  placePreviewTtsMessage,
  useMapPreviewStore,
} from "@/stores/map-preview-store";
import { useMapModeStore, useSimulationStore, useTtsStore } from "@/stores";
import PlacePreviewOverlay from "@/app/_components/tmap/PlacePreviewOverlay";

type RuntimeGetter = () => {
  vw: VWorldNamespace | null;
  controller: VWorldMapController | null;
};

type Props = {
  ready: boolean;
  getRuntime: RuntimeGetter;
};

/** 출발·도착 선택 시 3D 지도 프리뷰 — 느린 무한 회전 + TTS */
export default function PlacePreviewHost({ ready, getRuntime }: Props) {
  const active = useMapPreviewStore((s) => s.active);
  const kind = useMapPreviewStore((s) => s.kind);
  const place = useMapPreviewStore((s) => s.place);
  const sessionId = useMapPreviewStore((s) => s.sessionId);
  const stopPreview = useMapPreviewStore((s) => s.stopPreview);
  const mapMode = useMapModeStore((s) => s.mode);

  const markerRef = useRef(new PlacePreviewMarkerOverlay());
  const orbitRef = useRef<PlacePreviewOrbitState | null>(null);
  const rafRef = useRef(0);
  const lastTtsSessionRef = useRef(0);
  const lastFrameMsRef = useRef(0);

  useEffect(() => {
    if (!ready || !active || !place || !kind || mapMode !== "3d") {
      cancelAnimationFrame(rafRef.current);
      orbitRef.current = null;
      markerRef.current.clear();
      return;
    }

    const simStatus = useSimulationStore.getState().status;
    if (simStatus === "running" || simStatus === "paused") {
      stopPreview();
      return;
    }

    const { vw, controller } = getRuntime();
    const map3d = controller ? getMap3D(controller) : null;
    if (!vw || !map3d) return;

    cancelCameraFlight();
    setCesiumCameraInputEnabled(true);

    orbitRef.current = flyToPlacePreview(place.lng, place.lat, kind);
    markerRef.current.sync(
      vw,
      place.lng,
      place.lat,
      kind,
      orbitRef.current.groundM
    );

    if (lastTtsSessionRef.current !== sessionId) {
      lastTtsSessionRef.current = sessionId;
      const tts = useTtsStore.getState();
      if (tts.enabled) {
        void tts.speak(placePreviewTtsMessage(kind));
      }
    }

    lastFrameMsRef.current = performance.now();

    const tick = (now: number) => {
      const preview = useMapPreviewStore.getState();
      if (
        !preview.active ||
        !preview.place ||
        useMapModeStore.getState().mode !== "3d"
      ) {
        return;
      }

      const status = useSimulationStore.getState().status;
      if (status === "running" || status === "paused") {
        useMapPreviewStore.getState().stopPreview();
        return;
      }

      const deltaSec = Math.min(0.05, (now - lastFrameMsRef.current) / 1000);
      lastFrameMsRef.current = now;

      if (orbitRef.current) {
        orbitRef.current = advancePlacePreviewOrbit(
          orbitRef.current,
          deltaSec
        );
        applyPlacePreviewOrbit(orbitRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      orbitRef.current = null;
      markerRef.current.clear();
    };
  }, [ready, active, place, kind, sessionId, mapMode, getRuntime, stopPreview]);

  if (!active || !place || !kind || mapMode !== "3d") return null;

  return (
    <PlacePreviewOverlay
      kind={kind}
      place={place}
      onDismiss={stopPreview}
    />
  );
}
