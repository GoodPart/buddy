import type { RoutePosition } from "@/lib/tmap/types";
import type { VWorldNamespace } from "./global.d";

/**
 * VWorld 3D(ws3d.viewer = Cesium)에서 glb 차량 표시.
 * ModelZ.redraw()는 매 프레임 호출 시 glb 재로드로 모델이 깜빡/소실됨 → entity position 갱신만 사용.
 */
export const VEHICLE_GLB_URL = "/assets/modeling/humvee/humvee-vehicle.glb";
export const VEHICLE_2D_ICON_URL = "/assets/modeling/humvee/car-top.svg";

const VEHICLE_MODEL_ID = "buddy-vehicle-model";
/** glb 최장 축(Z) 길이 — 지면 Plane 제거 후 inspect 기준 ~3.3 */
const MODEL_UNIT_LENGTH = 3.3;
const TARGET_LENGTH_M = 4.8;
export const VEHICLE_MODEL_SCALE = TARGET_LENGTH_M / MODEL_UNIT_LENGTH;
const HEIGHT_ABOVE_TERRAIN_M = 1.2;
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
    HeightReference?: { RELATIVE_TO_GROUND: number };
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

function heightReference(C: NonNullable<Ws3dRuntime["common"]>): number {
  return C.HeightReference?.RELATIVE_TO_GROUND ?? 2;
}

function buildPosition(
  C: NonNullable<Ws3dRuntime["common"]>,
  pos: RoutePosition
): Cartesian3 {
  return C.Cartesian3.fromDegrees(
    pos.lng,
    pos.lat,
    HEIGHT_ABOVE_TERRAIN_M
  );
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

function modelGraphics(C: NonNullable<Ws3dRuntime["common"]>) {
  return {
    uri: VEHICLE_GLB_URL,
    scale: VEHICLE_MODEL_SCALE,
    minimumPixelSize: 48,
    maximumScale: 20_000,
    heightReference: heightReference(C),
    runAnimations: false,
  };
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

function applyEntityTransform(
  C: NonNullable<Ws3dRuntime["common"]>,
  entity: CesiumEntity,
  pos: RoutePosition
) {
  const position = buildPosition(C, pos);
  const orientation = buildOrientation(C, position, pos.bearing);

  setEntityProperty(
    entity,
    "position",
    position,
    C.ConstantPositionProperty
  );

  if (orientation) {
    setEntityProperty(entity, "orientation", orientation, C.ConstantProperty);
  }
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

  sync(_vw: VWorldNamespace, pos: RoutePosition | null, show: boolean): void {
    if (!show || !pos) {
      this.clear();
      return;
    }

    const runtime = getRuntime();
    if (!runtime) return;

    const { C, entities } = runtime;

    if (!this.entity) {
      try {
        const position = buildPosition(C, pos);
        this.entity = entities.add({
          id: VEHICLE_MODEL_ID,
          position,
          orientation: buildOrientation(C, position, pos.bearing),
          show: true,
          model: modelGraphics(C),
        });
      } catch (e) {
        console.warn("차량 3D 모델 생성 실패:", e);
      }
      return;
    }

    try {
      applyEntityTransform(C, this.entity, pos);
      this.entity.show = true;
    } catch (e) {
      console.warn("차량 3D 모델 갱신 실패:", e);
    }
  }

  clear(): void {
    removeEntity(this.entity);
    this.entity = null;
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
