import { destination } from "@turf/turf";
import type { PlacePreviewKind } from "@/stores/map-preview-store";
import { setCameraView } from "./chase-camera";
import { drivingSurfaceHeight } from "./surface-probe";

/** 초당 회전 각도 — 한 바퀴 약 2분 */
const ORBIT_DEG_PER_SEC = 3;

type OrbitProfile = {
  radiusM: number;
  pitchDeg: number;
  heightAboveGroundM: number;
};

/** 교차로·건물 면이 보이는 비스듬한 스트리트 뷰 (출발·도착 공통) */
const PREVIEW_PROFILE: OrbitProfile = {
  radiusM: 140,
  pitchDeg: -50,
  heightAboveGroundM: 200,
};

function profileForKind(_kind: PlacePreviewKind): OrbitProfile {
  return PREVIEW_PROFILE;
}

export type PlacePreviewOrbitState = {
  centerLng: number;
  centerLat: number;
  groundM: number;
  angleDeg: number;
  profile: OrbitProfile;
};

export function createPlacePreviewOrbit(
  lng: number,
  lat: number,
  kind: PlacePreviewKind
): PlacePreviewOrbitState {
  const groundM = drivingSurfaceHeight.sampleForCamera(lng, lat, 0);
  return {
    centerLng: lng,
    centerLat: lat,
    groundM,
    angleDeg: 0,
    profile: profileForKind(kind),
  };
}

export function advancePlacePreviewOrbit(
  state: PlacePreviewOrbitState,
  deltaSec: number
): PlacePreviewOrbitState {
  return {
    ...state,
    angleDeg: (state.angleDeg + ORBIT_DEG_PER_SEC * deltaSec) % 360,
  };
}

export function applyPlacePreviewOrbit(state: PlacePreviewOrbitState): void {
  const { centerLng, centerLat, groundM, angleDeg, profile } = state;
  const { radiusM, pitchDeg, heightAboveGroundM } = profile;

  const camPos = destination(
    [centerLng, centerLat],
    radiusM / 1000,
    angleDeg,
    { units: "kilometers" }
  );
  const [camLng, camLat] = camPos.geometry.coordinates;
  const lookHeading = (angleDeg + 180) % 360;
  const altitude = groundM + heightAboveGroundM;

  setCameraView(camLng, camLat, altitude, lookHeading, pitchDeg);
}

/** 첫 프레임 — 해당 위치로 즉시 이동 후 오빗 시작 */
export function flyToPlacePreview(
  lng: number,
  lat: number,
  kind: PlacePreviewKind
): PlacePreviewOrbitState {
  const state = createPlacePreviewOrbit(lng, lat, kind);
  applyPlacePreviewOrbit(state);
  return state;
}
