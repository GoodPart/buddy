import { destination } from "@turf/turf";
import type { RoutePosition } from "@/lib/tmap/types";
import type { MapDisplayMode } from "./map-mode";
import type { VWorldMapInstance, VWorldNamespace } from "./global.d";

export type ChaseCameraOffsets = {
  /** 차량 뒤쪽 거리(m) — 휠 줌 */
  rangeM: number;
  /** 경로 진행 방향 기준 좌우 오빗(°) — 드래그 좌우 */
  headingOffsetDeg: number;
  /** 카메라 피치(°) — 드래그 상하 */
  pitchDeg: number;
  /** 진행 방향 기준 좌우 이동(m) — Shift+드래그 / 우클릭 드래그 */
  lateralOffsetM: number;
  /** 지형 위 추가 고도(m) — Shift+드래그 상하 */
  heightAboveTerrainM: number;
};

export const DEFAULT_CHASE_OFFSETS: ChaseCameraOffsets = {
  rangeM: 20,
  headingOffsetDeg: 0,
  pitchDeg: -14.4,
  lateralOffsetM: 0,
  heightAboveTerrainM: 8,
};

const FOLLOW_HEIGHT_2D_M = 1800;
const MIN_RANGE_M = 5;
const MAX_RANGE_M = 400;
const MIN_PITCH_DEG = -80;
const MAX_PITCH_DEG = -5;
const MIN_HEIGHT_M = 3;
const MAX_HEIGHT_M = 150;
const MAX_LATERAL_M = 150;

type Ws3dRuntime = {
  viewer?: {
    scene?: {
      globe?: {
        getHeight: (carto: { longitude: number; latitude: number }) => number | undefined;
      };
      camera?: {
        cancelFlight?: () => void;
        setView: (options: {
          destination: { x: number; y: number; z: number };
          orientation?: { heading: number; pitch: number; roll: number };
        }) => void;
      };
    };
  };
  common?: {
    Cartesian3: {
      fromDegrees: (lng: number, lat: number, alt: number) => {
        x: number;
        y: number;
        z: number;
      };
    };
    CesiumMath: { toRadians: (deg: number) => number };
    Cartographic?: {
      fromDegrees: (lng: number, lat: number) => { longitude: number; latitude: number };
    };
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getWs3d(): Ws3dRuntime | null {
  return (window as unknown as { ws3d?: Ws3dRuntime }).ws3d ?? null;
}

function resolveTerrainHeight(ws3d: Ws3dRuntime, lng: number, lat: number): number {
  try {
    const carto = ws3d.common?.Cartographic?.fromDegrees(lng, lat);
    if (!carto) return 0;
    const height = ws3d.viewer?.scene?.globe?.getHeight(carto);
    return height != null && Number.isFinite(height) ? height : 0;
  } catch {
    return 0;
  }
}

function setCameraView(
  lng: number,
  lat: number,
  altitude: number,
  headingDeg: number,
  pitchDeg: number
) {
  const ws3d = getWs3d();
  const camera = ws3d?.viewer?.scene?.camera;
  const Cartesian3 = ws3d?.common?.Cartesian3;
  const CesiumMath = ws3d?.common?.CesiumMath;
  if (!camera || !Cartesian3 || !CesiumMath) return false;

  camera.setView({
    destination: Cartesian3.fromDegrees(lng, lat, altitude),
    orientation: {
      heading: CesiumMath.toRadians(headingDeg),
      pitch: CesiumMath.toRadians(pitchDeg),
      roll: 0,
    },
  });
  return true;
}

export function cancelCameraFlight() {
  try {
    getWs3d()?.viewer?.scene?.camera?.cancelFlight?.();
  } catch {
    /* ignore */
  }
}

/** 추적 모드에서는 Cesium 기본 드래그/줌과 충돌하지 않도록 입력을 끈다 */
export function setCesiumCameraInputEnabled(enabled: boolean) {
  try {
    const controller = (
      window as unknown as {
        ws3d?: {
          viewer?: {
            scene?: {
              screenSpaceCameraController?: {
                enableInputs?: boolean;
                enableRotate?: boolean;
                enableTranslate?: boolean;
                enableZoom?: boolean;
                enableTilt?: boolean;
              };
            };
          };
        };
      }
    ).ws3d?.viewer?.scene?.screenSpaceCameraController;

    if (!controller) return;

    controller.enableInputs = enabled;
    controller.enableRotate = enabled;
    controller.enableTranslate = enabled;
    controller.enableZoom = enabled;
    controller.enableTilt = enabled;
  } catch {
    /* ignore */
  }
}

export function resetChaseCameraOffsets(
  offsets: ChaseCameraOffsets,
  defaults: ChaseCameraOffsets = DEFAULT_CHASE_OFFSETS
) {
  Object.assign(offsets, defaults);
}

export function followChaseCamera(
  vw: VWorldNamespace,
  map: VWorldMapInstance,
  pos: RoutePosition,
  mapMode: MapDisplayMode,
  offsets: ChaseCameraOffsets
) {
  if (mapMode === "2d") {
    const height = FOLLOW_HEIGHT_2D_M + offsets.heightAboveTerrainM * 10;
    if (setCameraView(pos.lng, pos.lat, height, offsets.headingOffsetDeg, -90)) {
      return;
    }
    map.moveTo(
      new vw.CameraPosition(
        new vw.CoordZ(pos.lng, pos.lat, height),
        new vw.Direction(offsets.headingOffsetDeg, -90, 0)
      )
    );
    return;
  }

  const orbitHeading =
    (pos.bearing + offsets.headingOffsetDeg + 360) % 360;
  const behindHeading = (orbitHeading + 180) % 360;
  const pitchRad = (Math.abs(offsets.pitchDeg) * Math.PI) / 180;
  const horizontalM = offsets.rangeM * Math.cos(pitchRad);
  const verticalM = offsets.rangeM * Math.sin(pitchRad);

  const behind = destination(
    [pos.lng, pos.lat],
    horizontalM / 1000,
    behindHeading,
    { units: "kilometers" }
  );
  let [camLng, camLat] = behind.geometry.coordinates;

  if (offsets.lateralOffsetM !== 0) {
    const lateralHeading =
      offsets.lateralOffsetM > 0
        ? (orbitHeading + 90) % 360
        : (orbitHeading + 270) % 360;
    const lateral = destination(
      [camLng, camLat],
      Math.abs(offsets.lateralOffsetM) / 1000,
      lateralHeading,
      { units: "kilometers" }
    );
    [camLng, camLat] = lateral.geometry.coordinates;
  }

  const ws3d = getWs3d();
  const terrainH = ws3d ? resolveTerrainHeight(ws3d, camLng, camLat) : 0;
  const altitude = terrainH + verticalM + offsets.heightAboveTerrainM;

  if (setCameraView(camLng, camLat, altitude, orbitHeading, offsets.pitchDeg)) {
    return;
  }

  map.moveTo(
    new vw.CameraPosition(
      new vw.CoordZ(camLng, camLat, altitude),
      new vw.Direction(orbitHeading, offsets.pitchDeg, 0)
    )
  );
}

type AttachChaseInputOptions = {
  enabled?: () => boolean;
  mapMode?: () => MapDisplayMode;
};

/**
 * 추적 중에도 마커 기준 줌·회전·이동 오프셋을 조절한다.
 * - 휠: 거리(zoom)
 * - 드래그: heading/pitch 회전
 * - Shift+드래그 또는 우클릭 드래그: 좌우·고도 이동
 */
export function attachChaseCameraInput(
  root: HTMLElement,
  offsets: ChaseCameraOffsets,
  options?: AttachChaseInputOptions
): () => void {
  let dragging = false;
  let panMode = false;
  let lastX = 0;
  let lastY = 0;

  const isEnabled = () => options?.enabled?.() ?? true;

  const onWheel = (e: WheelEvent) => {
    if (!isEnabled()) return;
    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    if (options?.mapMode?.() === "2d") {
      offsets.heightAboveTerrainM = clamp(
        offsets.heightAboveTerrainM * (e.deltaY > 0 ? 1.15 : 0.87),
        0.1,
        50
      );
    } else {
      offsets.rangeM = clamp(offsets.rangeM * factor, MIN_RANGE_M, MAX_RANGE_M);
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!isEnabled() || e.button > 2) return;
    dragging = true;
    panMode = e.button === 2 || e.shiftKey;
    lastX = e.clientX;
    lastY = e.clientY;
    root.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (panMode) {
      offsets.lateralOffsetM = clamp(
        offsets.lateralOffsetM + dx * 0.4,
        -MAX_LATERAL_M,
        MAX_LATERAL_M
      );
      offsets.heightAboveTerrainM = clamp(
        offsets.heightAboveTerrainM - dy * 0.25,
        MIN_HEIGHT_M,
        MAX_HEIGHT_M
      );
      return;
    }

    offsets.headingOffsetDeg += dx * 0.35;
    offsets.pitchDeg = clamp(
      offsets.pitchDeg - dy * 0.25,
      MIN_PITCH_DEG,
      MAX_PITCH_DEG
    );
  };

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (root.hasPointerCapture(e.pointerId)) {
      root.releasePointerCapture(e.pointerId);
    }
  };

  const onContextMenu = (e: Event) => {
    if (isEnabled()) e.preventDefault();
  };

  root.addEventListener("wheel", onWheel, { passive: false, capture: true });
  root.addEventListener("pointerdown", onPointerDown, { capture: true });
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);
  root.addEventListener("contextmenu", onContextMenu);

  return () => {
    root.removeEventListener("wheel", onWheel, { capture: true });
    root.removeEventListener("pointerdown", onPointerDown, { capture: true });
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", endDrag);
    root.removeEventListener("pointercancel", endDrag);
    root.removeEventListener("contextmenu", onContextMenu);
  };
}
