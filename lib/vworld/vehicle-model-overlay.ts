import type { RoutePosition } from "@/lib/tmap/types";
import {
  clearSurfaceProbeCache,
  drivingSurfaceHeight,
  type DrivingSurfaceState,
} from "./surface-probe";
import type { VWorldNamespace } from "./global.d";

/**
 * VWorld 3D(ws3d.viewer = Cesium) glb 차량.
 * Raycast 주행면 + 공용 안정화 트래커.
 */
export const VEHICLE_GLB_URL = "/assets/modeling/humvee/humvee-vehicle.glb";
export const VEHICLE_2D_ICON_URL = "/assets/modeling/humvee/car-top.svg";

const VEHICLE_MODEL_ID = "buddy-vehicle-model";
const MODEL_UNIT_LENGTH = 3.3;
const TARGET_LENGTH_M = 4.8;
export const VEHICLE_MODEL_SCALE = TARGET_LENGTH_M / MODEL_UNIT_LENGTH;
const HEADING_OFFSET_DEG = -90;

type Cartesian3 = { x: number; y: number; z: number };

type CesiumProperty = {
  setValue?: (value: unknown) => void;
};

type CesiumEntity = {
  id?: string;
  show: boolean;
  position?: unknown | CesiumProperty;
  orientation?: unknown | CesiumProperty;
  model?: unknown | CesiumProperty;
};

type Ws3dRuntime = {
  viewer?: {
    entities: {
      getById: (id: string) => CesiumEntity | undefined;
      add: (opts: Record<string, unknown>) => CesiumEntity;
      removeById: (id: string) => boolean;
    };
    objectManager?: {
      removeGeometryById: (id: string) => void;
    };
  };
  common?: {
    Cartesian3: { fromDegrees: (lng: number, lat: number, alt: number) => Cartesian3 };
    CesiumMath: { toRadians: (deg: number) => number };
    HeadingPitchRoll: new (heading: number, pitch: number, roll: number) => unknown;
    HeightReference?: { NONE: number };
    ConstantPositionProperty?: new (value: Cartesian3) => unknown;
    ConstantProperty?: new (value: unknown) => unknown;
    Transforms?: {
      headingPitchRollQuaternion: (
        position: Cartesian3,
        hpr: unknown
      ) => unknown;
    };
  };
};

function getWs3d(): Ws3dRuntime | null {
  return (window as unknown as { ws3d?: Ws3dRuntime }).ws3d ?? null;
}

function getRuntime(): {
  C: NonNullable<Ws3dRuntime["common"]>;
  entities: NonNullable<NonNullable<Ws3dRuntime["viewer"]>["entities"]>;
} | null {
  const ws3d = getWs3d();
  const C = ws3d?.common;
  const entities = ws3d?.viewer?.entities;
  if (!C?.Cartesian3 || !C.CesiumMath || !entities?.add) return null;
  return { C, entities };
}

function heightReferenceNone(C: NonNullable<Ws3dRuntime["common"]>): number {
  return C.HeightReference?.NONE ?? 0;
}

function modelGraphics(C: NonNullable<Ws3dRuntime["common"]>) {
  return {
    uri: VEHICLE_GLB_URL,
    scale: VEHICLE_MODEL_SCALE,
    minimumPixelSize: 48,
    maximumScale: 20_000,
    heightReference: heightReferenceNone(C),
    runAnimations: false,
  };
}

function buildOrientation(
  C: NonNullable<Ws3dRuntime["common"]>,
  position: Cartesian3,
  bearingDeg: number
): unknown | undefined {
  if (!C.Transforms?.headingPitchRollQuaternion || !C.HeadingPitchRoll) {
    return undefined;
  }
  const headingRad = C.CesiumMath.toRadians(bearingDeg + HEADING_OFFSET_DEG);
  return C.Transforms.headingPitchRollQuaternion(
    position,
    new C.HeadingPitchRoll(headingRad, 0, 0)
  );
}

function setEntityProperty(
  entity: CesiumEntity,
  key: "position" | "orientation",
  value: unknown,
  PropertyCtor: (new (value: unknown) => unknown) | undefined
) {
  const current = entity[key] as CesiumProperty | undefined;
  if (current?.setValue) {
    current.setValue(value);
    return;
  }
  if (PropertyCtor) {
    entity[key] = new PropertyCtor(value);
    return;
  }
  entity[key] = value;
}

function removeEntity(entity: CesiumEntity | null) {
  if (!entity) return;
  const runtime = getRuntime();
  if (!runtime) return;

  try {
    runtime.entities.removeById(VEHICLE_MODEL_ID);
  } catch {
    /* ignore */
  }

  try {
    if (entity.id && entity.id !== VEHICLE_MODEL_ID) {
      getWs3d()?.viewer?.objectManager?.removeGeometryById(entity.id);
    }
  } catch {
    /* ignore */
  }
}

export class VehicleModelOverlay {
  private entity: CesiumEntity | null = null;

  sync(
    _vw: VWorldNamespace,
    pos: RoutePosition | null,
    show: boolean,
    traveledM = 0,
    surfaceState?: DrivingSurfaceState | null
  ): void {
    if (!show || !pos) {
      this.clear();
      return;
    }

    const runtime = getRuntime();
    if (!runtime) return;

    const { C, entities } = runtime;
    const altitudeM =
      surfaceState?.heightM ??
      drivingSurfaceHeight.updateFrameState(pos.lng, pos.lat, traveledM).heightM;
    const position = C.Cartesian3.fromDegrees(pos.lng, pos.lat, altitudeM);
    const orientation = buildOrientation(C, position, pos.bearing);

    if (!this.entity) {
      try {
        this.entity = entities.add({
          id: VEHICLE_MODEL_ID,
          position,
          orientation,
          show: true,
          model: modelGraphics(C),
        });
      } catch (e) {
        console.warn("차량 3D 모델 생성 실패:", e);
      }
      return;
    }

    try {
      setEntityProperty(
        this.entity,
        "position",
        position,
        C.ConstantPositionProperty as (new (value: unknown) => unknown) | undefined
      );
      if (orientation) {
        setEntityProperty(this.entity, "orientation", orientation, C.ConstantProperty);
      }
      this.entity.show = true;
    } catch (e) {
      console.warn("차량 3D 모델 갱신 실패:", e);
    }
  }

  clear(): void {
    removeEntity(this.entity);
    this.entity = null;
  }

  reset(): void {
    clearSurfaceProbeCache();
    this.clear();
  }
}

export function vehicleIconStyle(
  ol: {
    style: {
      Style: new (opts: Record<string, unknown>) => unknown;
      Icon: new (opts: Record<string, unknown>) => unknown;
    };
  },
  bearingDeg: number
): unknown {
  return new ol.style.Style({
    image: new ol.style.Icon({
      src: VEHICLE_2D_ICON_URL,
      scale: 0.55,
      anchor: [0.5, 0.5],
      rotation: (bearingDeg * Math.PI) / 180,
      rotateWithView: false,
    }),
  });
}
