import type { MapDisplayMode } from "./map-mode";
import type {
  VWorldGeometry,
  VWorldNamespace,
  VWorldOlMap,
} from "./global.d";

const MY_LOCATION_ID = "buddy-my-location";

type VWorldGeometryInstance = VWorldGeometry & {
  getId?: () => string;
  ws3dGraphics?: { id: string };
  setFillColor?: (color: unknown) => void;
  setOutLineColor?: (color: unknown) => void;
};

type OlNamespace = {
  Feature: new (opts?: { geometry?: unknown }) => {
    setGeometry(geometry: unknown): void;
  };
  geom: { Point: new (coord: number[]) => unknown };
  layer: { Vector: new (opts: Record<string, unknown>) => OlVectorLayer };
  source: { Vector: new (opts: { features: unknown[] }) => unknown };
  style: {
    Style: new (opts: Record<string, unknown>) => unknown;
    Circle: new (opts: Record<string, unknown>) => unknown;
    Fill: new (opts: { color: string }) => unknown;
    Stroke: new (opts: { color: string; width: number }) => unknown;
  };
  proj: { fromLonLat: (coord: number[]) => number[] };
};

type OlVectorLayer = {
  set?(key: string, value: unknown): void;
};

function getOl(): OlNamespace {
  const ol = (window as unknown as { ol?: OlNamespace }).ol;
  if (!ol) throw new Error("OpenLayers가 로드되지 않았습니다.");
  return ol;
}

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

export class MyLocationOverlay {
  private geometry3d: VWorldGeometryInstance | null = null;
  private olLayer: OlVectorLayer | null = null;
  private olFeature: { setGeometry(geometry: unknown): void } | null = null;

  clear(map2d: VWorldOlMap | null) {
    removeGeometry(this.geometry3d);
    this.geometry3d = null;

    if (this.olLayer && map2d) {
      try {
        map2d.removeLayer(this.olLayer);
      } catch {
        /* ignore */
      }
    }
    this.olLayer = null;
    this.olFeature = null;
  }

  sync(
    vw: VWorldNamespace,
    map2d: VWorldOlMap | null,
    lng: number,
    lat: number,
    mode: MapDisplayMode
  ) {
    if (mode === "2d") {
      this.sync2D(map2d, lng, lat);
      removeGeometry(this.geometry3d);
      this.geometry3d = null;
      return;
    }

    this.sync3D(vw, lng, lat);
    if (this.olLayer && map2d) {
      try {
        map2d.removeLayer(this.olLayer);
      } catch {
        /* ignore */
      }
      this.olLayer = null;
      this.olFeature = null;
    }
  }

  private sync3D(vw: VWorldNamespace, lng: number, lat: number) {
    removeGeometry(this.geometry3d);
    this.geometry3d = null;

    if (!vw.geom?.PointZ) return;

    const point = new vw.geom.PointZ(new vw.CoordZ(lng, lat, 14));
    point.setId?.(MY_LOCATION_ID);
    point.setFillColor?.(new vw.Color(14, 165, 233, 255));
    point.setOutLineColor?.(new vw.Color(255, 255, 255, 255));
    point.create();
    this.geometry3d = point;
  }

  private sync2D(map2d: VWorldOlMap | null, lng: number, lat: number) {
    if (!map2d) return;

    const ol = getOl();
    const coord = ol.proj.fromLonLat([lng, lat]);

    if (!this.olFeature) {
      this.olFeature = new ol.Feature({
        geometry: new ol.geom.Point(coord),
      });
      const layer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: [this.olFeature] }),
        style: new ol.style.Style({
          image: new ol.style.Circle({
            radius: 9,
            fill: new ol.style.Fill({ color: "rgba(14, 165, 233, 0.95)" }),
            stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
          }),
        }),
        zIndex: 120,
      });
      layer.set?.("id", MY_LOCATION_ID);
      map2d.addLayer(layer);
      this.olLayer = layer;
      return;
    }

    this.olFeature.setGeometry(new ol.geom.Point(coord));
  }
}
