import type { PlacePreviewKind } from "@/stores/map-preview-store";
import type { VWorldNamespace } from "./global.d";

const MARKER_ID = "buddy-place-preview";

type VWorldGeometryInstance = {
  getId?: () => string;
  ws3dGraphics?: { id: string };
  setFillColor?: (color: unknown) => void;
  setOutLineColor?: (color: unknown) => void;
};

function removeGeometry(geometry: VWorldGeometryInstance | null) {
  if (!geometry) return;

  try {
    const ws3d = (
      window as unknown as {
        ws3d?: {
          viewer?: {
            objectManager?: { removeGeometryById: (id: string) => void };
          };
        };
      }
    ).ws3d;

    const graphicsId = geometry.ws3dGraphics?.id ?? geometry.getId?.();
    if (graphicsId) {
      ws3d?.viewer?.objectManager?.removeGeometryById(graphicsId);
    }

    const objectId = geometry.getId?.();
    const superviser = (
      window.vw as { ObjectSuperviser?: { removeById: (id: string) => void } }
    )?.ObjectSuperviser;
    if (objectId && superviser) {
      superviser.removeById(objectId);
    }
  } catch {
    /* ignore */
  }
}

const COLORS: Record<
  PlacePreviewKind,
  { r: number; g: number; b: number }
> = {
  departure: { r: 34, g: 197, b: 94 },
  destination: { r: 239, g: 68, b: 68 },
};

export class PlacePreviewMarkerOverlay {
  private geometry3d: VWorldGeometryInstance | null = null;

  clear() {
    removeGeometry(this.geometry3d);
    this.geometry3d = null;
  }

  sync(
    vw: VWorldNamespace,
    lng: number,
    lat: number,
    kind: PlacePreviewKind,
    groundM: number
  ) {
    removeGeometry(this.geometry3d);
    this.geometry3d = null;

    if (!vw.geom?.PointZ) return;

    const { r, g, b } = COLORS[kind];
    const point = new vw.geom.PointZ(
      new vw.CoordZ(lng, lat, groundM + 2)
    );
    point.setId?.(MARKER_ID);
    point.setFillColor?.(new vw.Color(r, g, b, 255));
    point.setOutLineColor?.(new vw.Color(255, 255, 255, 255));
    point.create();
    this.geometry3d = point;
  }
}
