import type { RouteResponse } from "@/lib/tmap/types";
import type { RoutePosition } from "@/lib/tmap/types";
import { getRouteCoords } from "@/lib/tmap/route-line";
import type { MapDisplayMode } from "./map-mode";
import type {
  VWorldGeometry,
  VWorldMapInstance,
  VWorldNamespace,
  VWorldOlMap,
} from "./global.d";

const ROUTE_ID = "buddy-route";
const START_ID = "buddy-start";
const END_ID = "buddy-end";
const VEHICLE_ID = "buddy-vehicle";

type VWorldGeometryInstance = VWorldGeometry & {
  getId?: () => string;
  ws3dGraphics?: { id: string };
  setWidth?: (width: number) => void;
  setFillColor?: (color: unknown) => void;
  setOutLineColor?: (color: unknown) => void;
};

type OlNamespace = {
  Feature: new (opts?: { geometry?: unknown; kind?: string }) => {
    setGeometry(geometry: unknown): void;
  };
  geom: {
    LineString: new (coords: number[][]) => unknown;
    Point: new (coord: number[]) => unknown;
  };
  layer: { Vector: new (opts: Record<string, unknown>) => OlVectorLayer };
  source: { Vector: new (opts: { features: unknown[] }) => OlVectorSource };
  style: {
    Style: new (opts: Record<string, unknown>) => unknown;
    Circle: new (opts: Record<string, unknown>) => unknown;
    Fill: new (opts: { color: string }) => unknown;
    Stroke: new (opts: { color: string; width: number }) => unknown;
  };
  proj: { fromLonLat: (coord: number[]) => number[] };
  extent: { boundingExtent: (coords: number[][]) => number[] };
};

type OlVectorLayer = {
  set?(key: string, value: unknown): void;
};

type OlVectorSource = {
  clear?(): void;
  addFeature?(feature: unknown): void;
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

function pointStyle(ol: OlNamespace, color: string, radius = 8) {
  return new ol.style.Style({
    image: new ol.style.Circle({
      radius,
      fill: new ol.style.Fill({ color }),
      stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
    }),
  });
}

export class VWorldRouteOverlay {
  private staticGeometries: VWorldGeometryInstance[] = [];
  private vehicleGeometry: VWorldGeometryInstance | null = null;
  private olRouteLayer: OlVectorLayer | null = null;
  private olVehicleLayer: OlVectorLayer | null = null;
  private olVehicleFeature: { setGeometry(geometry: unknown): void } | null =
    null;

  clear3D(map: VWorldMapInstance) {
    for (const geometry of [...this.staticGeometries, this.vehicleGeometry]) {
      removeGeometry(geometry);
    }
    this.staticGeometries = [];
    this.vehicleGeometry = null;

    try {
      map.clear?.();
    } catch {
      /* ignore */
    }
  }

  clear2D(map2d: VWorldOlMap) {
    if (this.olRouteLayer) {
      try {
        map2d.removeLayer(this.olRouteLayer);
      } catch {
        /* ignore */
      }
      this.olRouteLayer = null;
    }
    if (this.olVehicleLayer) {
      try {
        map2d.removeLayer(this.olVehicleLayer);
      } catch {
        /* ignore */
      }
      this.olVehicleLayer = null;
    }
    this.olVehicleFeature = null;
  }

  clear(
    map: VWorldMapInstance | null,
    map2d: VWorldOlMap | null,
    mode: MapDisplayMode
  ) {
    if (mode === "2d") {
      if (map2d) this.clear2D(map2d);
      return;
    }
    if (map) this.clear3D(map);
  }

  private addStatic(geometry: VWorldGeometryInstance) {
    geometry.create();
    this.staticGeometries.push(geometry);
  }

  drawRoute3D(vw: VWorldNamespace, map: VWorldMapInstance, route: RouteResponse) {
    this.clear3D(map);

    const coords = getRouteCoords(route);
    if (coords.length < 2 || !vw.geom?.LineString) return;

    const points = coords.map(([lng, lat]) => new vw.Coord(lng, lat));
    const line = new vw.geom.LineString(new vw.Collection(points));
    line.setId?.(ROUTE_ID);
    line.setFillColor?.(new vw.Color(37, 99, 235, 255));
    line.setOutLineColor?.(new vw.Color(255, 255, 255, 255));
    line.setWidth?.(5);
    this.addStatic(line);

    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];
    this.addPoint3D(vw, START_ID, startLng, startLat, 0, 255, 0);
    this.addPoint3D(vw, END_ID, endLng, endLat, 255, 0, 0);
  }

  drawRoute2D(map2d: VWorldOlMap, route: RouteResponse) {
    this.clear2D(map2d);

    const coords = getRouteCoords(route);
    if (coords.length < 2) return;

    const ol = getOl();
    const projected = coords.map(([lng, lat]) => ol.proj.fromLonLat([lng, lat]));

    const features = [
      new ol.Feature({
        geometry: new ol.geom.LineString(projected),
      }),
      new ol.Feature({
        geometry: new ol.geom.Point(projected[0]),
        kind: "start",
      }),
      new ol.Feature({
        geometry: new ol.geom.Point(projected[projected.length - 1]),
        kind: "end",
      }),
    ];

    const layer = new ol.layer.Vector({
      source: new ol.source.Vector({ features }),
      style: (feature: {
        get: (key: string) => string | undefined;
        getGeometry: () => { getType: () => string };
      }) => {
        const kind = feature.get("kind");
        if (kind === "start") return pointStyle(ol, "#22c55e");
        if (kind === "end") return pointStyle(ol, "#ef4444");
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "#2563eb", width: 5 }),
        });
      },
      zIndex: 100,
    });
    layer.set?.("id", ROUTE_ID);

    map2d.addLayer(layer);
    this.olRouteLayer = layer;
  }

  drawRoute(
    vw: VWorldNamespace,
    map: VWorldMapInstance,
    map2d: VWorldOlMap | null,
    route: RouteResponse,
    mode: MapDisplayMode
  ) {
    if (mode === "2d") {
      if (!map2d) return;
      this.drawRoute2D(map2d, route);
      return;
    }
    this.drawRoute3D(vw, map, route);
  }

  private addPoint3D(
    vw: VWorldNamespace,
    id: string,
    lng: number,
    lat: number,
    r: number,
    g: number,
    b: number
  ) {
    if (!vw.geom?.PointZ) return;

    const point = new vw.geom.PointZ(new vw.CoordZ(lng, lat, 12));
    point.setId?.(id);
    point.setFillColor?.(new vw.Color(r, g, b, 255));
    point.setOutLineColor?.(new vw.Color(0, 0, 0, 255));
    this.addStatic(point);
  }

  syncVehicle3D(vw: VWorldNamespace, pos: RoutePosition | null, show: boolean) {
    removeGeometry(this.vehicleGeometry);
    this.vehicleGeometry = null;

    if (!show || !pos || !vw.geom?.PointZ) return;

    const vehicle = new vw.geom.PointZ(new vw.CoordZ(pos.lng, pos.lat, 12));
    vehicle.setId?.(VEHICLE_ID);
    vehicle.setFillColor?.(new vw.Color(29, 78, 216, 255));
    vehicle.setOutLineColor?.(new vw.Color(255, 255, 255, 255));
    vehicle.create();
    this.vehicleGeometry = vehicle;
  }

  syncVehicle2D(
    map2d: VWorldOlMap,
    pos: RoutePosition | null,
    show: boolean
  ) {
    if (!show || !pos) {
      if (this.olVehicleLayer) {
        try {
          map2d.removeLayer(this.olVehicleLayer);
        } catch {
          /* ignore */
        }
        this.olVehicleLayer = null;
        this.olVehicleFeature = null;
      }
      return;
    }

    const ol = getOl();
    const coord = ol.proj.fromLonLat([pos.lng, pos.lat]);

    if (!this.olVehicleFeature) {
      this.olVehicleFeature = new ol.Feature({
        geometry: new ol.geom.Point(coord),
      });
      const layer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: [this.olVehicleFeature] }),
        style: pointStyle(ol, "#1d4ed8", 9),
        zIndex: 110,
      });
      layer.set?.("id", VEHICLE_ID);
      map2d.addLayer(layer);
      this.olVehicleLayer = layer;
      return;
    }

    this.olVehicleFeature.setGeometry(new ol.geom.Point(coord));
  }

  syncVehicle(
    vw: VWorldNamespace,
    map2d: VWorldOlMap | null,
    pos: RoutePosition | null,
    show: boolean,
    mode: MapDisplayMode
  ) {
    if (mode === "2d") {
      if (map2d) this.syncVehicle2D(map2d, pos, show);
      return;
    }
    this.syncVehicle3D(vw, pos, show);
  }

  flyToRoute3D(
    vw: VWorldNamespace,
    map: VWorldMapInstance,
    route: RouteResponse
  ) {
    const b = route.bounds;
    const centerLng = (b.minLng + b.maxLng) / 2;
    const centerLat = (b.minLat + b.maxLat) / 2;
    const span = Math.max(b.maxLng - b.minLng, b.maxLat - b.minLat);
    const alt = Math.max(800, span * 111000 * 1.2);

    map.moveTo(
      new vw.CameraPosition(
        new vw.CoordZ(centerLng, centerLat, alt),
        new vw.Direction(0, -45, 0)
      )
    );
  }

  flyToRoute2D(map2d: VWorldOlMap, route: RouteResponse) {
    const coords = getRouteCoords(route);
    if (coords.length < 2) return;

    const ol = getOl();
    const projected = coords.map(([lng, lat]) => ol.proj.fromLonLat([lng, lat]));
    const extent = ol.extent.boundingExtent(projected);

    map2d.getView().fit(extent, {
      padding: [48, 48, 48, 48],
      maxZoom: 17,
      duration: 500,
    });
  }

  flyToRoute(
    vw: VWorldNamespace,
    map: VWorldMapInstance,
    map2d: VWorldOlMap | null,
    route: RouteResponse,
    mode: MapDisplayMode
  ) {
    if (mode === "2d") {
      if (map2d) this.flyToRoute2D(map2d, route);
      return;
    }
    this.flyToRoute3D(vw, map, route);
  }
}

/** @deprecated facility_build 표시는 RangeError 유발 — 항상 숨김 유지 */
export function enable3DBuildings(map: VWorldMapInstance) {
  try {
    map.getLayerElement?.("facility_build")?.hide?.();
  } catch {
    /* ignore */
  }
}
