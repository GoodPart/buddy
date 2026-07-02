import type { RouteResponse } from "@/lib/tmap/types";
import type { RoutePosition } from "@/lib/tmap/types";
import { buildElevatedSegments } from "@/lib/tmap/elevated-segments";
import { getRoutePathDistanceM } from "@/lib/tmap/guidance";
import { getRouteCoords } from "@/lib/tmap/route-line";
import type { DrivingSurfaceState } from "./surface-probe";
import {
  buildRouteSurfacePathAsync,
  DrivingSurfaceHeightTracker,
  drivingSurfaceHeight,
  getCachedRouteSurface,
  resetDrivingSurfaceForRoute,
  ROUTE_SURFACE_Z_BIAS_M,
  sampleRouteEndpointHeights,
  storeCachedRouteSurface,
  type RouteSurfaceCacheEntry,
} from "./surface-probe";
import { sliceCoordsForLinkSegment } from "@/lib/tmap/route-traffic-slice";
import {
  congestionToRgb,
  getCongestionColor,
} from "@/lib/tmap/traffic-congestion";
import {
  VehicleModelOverlay,
  vehicleIconStyle,
} from "./vehicle-model-overlay";
import type { MapDisplayMode } from "./map-mode";
import type {
  VWorldCoordZ,
  VWorldGeometry,
  VWorldMapInstance,
  VWorldNamespace,
  VWorldOlMap,
} from "./global.d";

const ROUTE_ID = "buddy-route";
const START_ID = "buddy-start";
const END_ID = "buddy-end";
const VEHICLE_ID = "buddy-vehicle";

/** 3D LineStringZ — 미터 단위 (2D는 px) */
const ROUTE_LINE_WIDTH_M = 5;
const ROUTE_HALO_ID = "buddy-route-halo";
const ROUTE_HALO_MIN_M = 14;
const ROUTE_HALO_MAX_M = 36;

export type RouteLineWidthMode = "overview" | "chase";

export function routeDisplayModeFromStatus(
  status: "idle" | "ready" | "running" | "paused" | "arrived"
): RouteLineWidthMode {
  return status === "running" || status === "paused" ? "chase" : "overview";
}

/** overview 전용 — 주행선(5m) 아래 halo */
export function computeRouteHaloWidthM(route: RouteResponse): number {
  const b = route.bounds;
  const span = Math.max(b.maxLng - b.minLng, b.maxLat - b.minLat);
  const altM = Math.max(800, span * 111_000 * 1.2);
  return Math.min(
    ROUTE_HALO_MAX_M,
    Math.max(ROUTE_HALO_MIN_M, altM * 0.01)
  );
}

/** @deprecated chase=5m 고정, overview=halo — 호환용 */
export function computeRouteLineWidthM(
  route: RouteResponse,
  mode: RouteLineWidthMode
): number {
  return mode === "chase" ? ROUTE_LINE_WIDTH_M : computeRouteHaloWidthM(route);
}

type RouteHaloSegment = {
  coords: [number, number][];
  heights: number[];
};

type VWorldGeometryInstance = VWorldGeometry & {
  getId?: () => string;
  ws3dGraphics?: { id: string };
  setWidth?: (width: number) => void;
  setFillColor?: (color: unknown) => void;
  setOutLineColor?: (color: unknown) => void;
};

type OlNamespace = {
  Feature: new (opts?: Record<string, unknown>) => {
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
    Icon: new (opts: Record<string, unknown>) => unknown;
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
  private routeHaloGeometries: VWorldGeometryInstance[] = [];
  private lastRouteHaloData: RouteHaloSegment[] = [];
  private routeDisplayMode: RouteLineWidthMode = "overview";
  private vehicleModelOverlay = new VehicleModelOverlay();
  private routeDrawGeneration = 0;
  private olRouteLayer: OlVectorLayer | null = null;
  private olVehicleLayer: OlVectorLayer | null = null;
  private olVehicleFeature: {
    setGeometry(geometry: unknown): void;
    setStyle(style: unknown): void;
  } | null = null;

  clear3D(map: VWorldMapInstance, opts?: { preserveVehicle?: boolean }) {
    for (const geometry of this.staticGeometries) {
      removeGeometry(geometry);
    }
    this.staticGeometries = [];
    this.clearRouteHalo();
    this.lastRouteHaloData = [];

    if (!opts?.preserveVehicle) {
      this.vehicleModelOverlay.reset();
    }
  }

  private clearRouteHalo() {
    for (const geometry of this.routeHaloGeometries) {
      removeGeometry(geometry);
    }
    this.routeHaloGeometries = [];
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

  private addRouteLine3D(
    vw: VWorldNamespace,
    id: string,
    segCoords: [number, number][],
    heights: number[],
    r: number,
    g: number,
    b: number
  ) {
    const zCoords = segCoords.map(
      ([lng, lat], i) =>
        new vw.CoordZ(lng, lat, heights[i] + ROUTE_SURFACE_Z_BIAS_M) as VWorldCoordZ
    );
    const collection = new vw.Collection(zCoords);

    const line =
      vw.geom?.LineStringZ != null
        ? new vw.geom.LineStringZ(collection)
        : vw.geom?.LineString != null
          ? new vw.geom.LineString(collection)
          : null;
    if (!line) return;

    line.setId?.(id);
    line.setFillColor?.(new vw.Color(r, g, b, 255));
    line.setOutLineColor?.(new vw.Color(255, 255, 255, 255));
    line.setWidth?.(ROUTE_LINE_WIDTH_M);
    this.addStatic(line);
  }

  private addRouteHaloLine3D(
    vw: VWorldNamespace,
    id: string,
    segCoords: [number, number][],
    heights: number[],
    widthM: number
  ) {
    const zCoords = segCoords.map(
      ([lng, lat], i) =>
        new vw.CoordZ(lng, lat, heights[i] + ROUTE_SURFACE_Z_BIAS_M) as VWorldCoordZ
    );
    const collection = new vw.Collection(zCoords);

    const line =
      vw.geom?.LineStringZ != null
        ? new vw.geom.LineStringZ(collection)
        : vw.geom?.LineString != null
          ? new vw.geom.LineString(collection)
          : null;
    if (!line) return;

    line.setId?.(id);
    line.setFillColor?.(new vw.Color(37, 99, 235, 140));
    line.setOutLineColor?.(new vw.Color(255, 255, 255, 180));
    line.setWidth?.(widthM);
    line.create();
    this.routeHaloGeometries.push(line);
  }

  private buildRouteHalo(
    vw: VWorldNamespace,
    route: RouteResponse,
    segments: RouteHaloSegment[]
  ) {
    this.clearRouteHalo();
    if (!segments.length) return;

    const widthM = computeRouteHaloWidthM(route);
    segments.forEach((seg, i) => {
      if (seg.coords.length < 2 || seg.heights.length !== seg.coords.length) return;
      this.addRouteHaloLine3D(
        vw,
        `${ROUTE_HALO_ID}-${i}`,
        seg.coords,
        seg.heights,
        widthM
      );
    });
  }

  private syncRouteHalo(vw: VWorldNamespace, route: RouteResponse) {
    if (this.routeDisplayMode !== "overview") {
      this.clearRouteHalo();
      return;
    }
    this.buildRouteHalo(vw, route, this.lastRouteHaloData);
  }

  /** overview=halo 표시, chase=halo 제거 (주행선 5m 유지) */
  setRouteDisplayMode(
    vw: VWorldNamespace,
    route: RouteResponse,
    mode: RouteLineWidthMode
  ) {
    this.routeDisplayMode = mode;
    this.syncRouteHalo(vw, route);
  }

  drawRoute3D(
    vw: VWorldNamespace,
    map: VWorldMapInstance,
    route: RouteResponse,
    displayMode: RouteLineWidthMode = "overview"
  ) {
    void this.drawRoute3DAsync(vw, map, route, displayMode);
  }

  private finishRoute3DDraw(
    vw: VWorldNamespace,
    route: RouteResponse,
    lines: RouteSurfaceCacheEntry["lines"]
  ) {
    this.lastRouteHaloData = lines.map((line) => ({
      coords: line.coords,
      heights: line.heights,
    }));
    this.syncRouteHalo(vw, route);
  }

  private drawMainRouteLines(
    vw: VWorldNamespace,
    lines: RouteSurfaceCacheEntry["lines"]
  ) {
    for (const line of lines) {
      this.addRouteLine3D(
        vw,
        line.id,
        line.coords,
        line.heights,
        line.r,
        line.g,
        line.b
      );
    }
  }

  private applyRouteSurfaceCache(
    vw: VWorldNamespace,
    route: RouteResponse,
    cached: RouteSurfaceCacheEntry
  ) {
    const coords = getRouteCoords(route);
    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];

    this.lastRouteHaloData = cached.lines.map((line) => ({
      coords: line.coords,
      heights: line.heights,
    }));
    this.syncRouteHalo(vw, route);
    this.drawMainRouteLines(vw, cached.lines);

    this.addPoint3D(
      vw,
      START_ID,
      startLng,
      startLat,
      cached.startH + ROUTE_SURFACE_Z_BIAS_M,
      0,
      255,
      0
    );
    this.addPoint3D(
      vw,
      END_ID,
      endLng,
      endLat,
      cached.endH + ROUTE_SURFACE_Z_BIAS_M,
      255,
      0,
      0
    );
  }

  async drawRoute3DAsync(
    vw: VWorldNamespace,
    map: VWorldMapInstance,
    route: RouteResponse,
    displayMode: RouteLineWidthMode = "overview"
  ) {
    const generation = ++this.routeDrawGeneration;
    const isStale = () => generation !== this.routeDrawGeneration;

    this.clear3D(map, { preserveVehicle: true });
    this.routeDisplayMode = displayMode;

    const coords = getRouteCoords(route);
    if (coords.length < 2 || (!vw.geom?.LineStringZ && !vw.geom?.LineString)) {
      return;
    }

    resetDrivingSurfaceForRoute();
    const elevatedSegments = buildElevatedSegments(
      route.guidances,
      getRoutePathDistanceM(route)
    );
    drivingSurfaceHeight.setElevatedSegments(elevatedSegments);

    const cached = getCachedRouteSurface(route);
    if (cached) {
      this.applyRouteSurfaceCache(vw, route, cached);
      return;
    }

    const pathDistM = getRoutePathDistanceM(route);
    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];

    const lines: RouteSurfaceCacheEntry["lines"] = [];
    let startH = 0;
    let endH = 0;

    const routeBaker = new DrivingSurfaceHeightTracker();
    routeBaker.setElevatedSegments(elevatedSegments);

    if (route.linkSegments.length > 0) {
      ({ startH, endH } = sampleRouteEndpointHeights(
        [startLng, startLat],
        [endLng, endLat],
        pathDistM,
        elevatedSegments,
        routeBaker
      ));

      for (let i = 0; i < route.linkSegments.length; i++) {
        if (isStale()) return;

        const seg = route.linkSegments[i];
        const segCoords = sliceCoordsForLinkSegment(route, seg);
        if (segCoords.length < 2) continue;

        const { coords: lineCoords, heights } = await buildRouteSurfacePathAsync(
          segCoords,
          elevatedSegments,
          seg.distanceStartM,
          { baker: routeBaker, shouldCancel: isStale }
        );
        if (isStale() || heights.length !== lineCoords.length) return;

        const { r, g, b } = congestionToRgb(seg.congestionLevel);
        lines.push({
          id: `${ROUTE_ID}-${i}`,
          coords: lineCoords,
          heights,
          r,
          g,
          b,
        });
      }
    } else {
      const path = await buildRouteSurfacePathAsync(
        coords,
        elevatedSegments,
        0,
        { baker: routeBaker, shouldCancel: isStale }
      );
      if (
        isStale() ||
        path.heights.length !== path.coords.length ||
        path.heights.length === 0
      ) {
        return;
      }

      startH = path.heights[0];
      endH = path.heights[path.heights.length - 1];
      lines.push({
        id: ROUTE_ID,
        coords: path.coords,
        heights: path.heights,
        r: 37,
        g: 99,
        b: 235,
      });
    }

    if (isStale()) return;

    this.finishRoute3DDraw(vw, route, lines);
    this.drawMainRouteLines(vw, lines);

    if (isStale()) return;

    this.addPoint3D(
      vw,
      START_ID,
      startLng,
      startLat,
      startH + ROUTE_SURFACE_Z_BIAS_M,
      0,
      255,
      0
    );
    this.addPoint3D(
      vw,
      END_ID,
      endLng,
      endLat,
      endH + ROUTE_SURFACE_Z_BIAS_M,
      255,
      0,
      0
    );

    storeCachedRouteSurface(route, { lines, startH, endH });
  }

  drawRoute2D(map2d: VWorldOlMap, route: RouteResponse) {
    this.clear2D(map2d);

    const coords = getRouteCoords(route);
    if (coords.length < 2) return;

    const ol = getOl();
    const projectedAll = coords.map(([lng, lat]) => ol.proj.fromLonLat([lng, lat]));

    const lineFeatures: unknown[] = [];

    if (route.linkSegments.length > 0) {
      for (let i = 0; i < route.linkSegments.length; i++) {
        const seg = route.linkSegments[i];
        const segCoords = sliceCoordsForLinkSegment(route, seg);
        if (segCoords.length < 2) continue;
        const projected = segCoords.map(([lng, lat]) => ol.proj.fromLonLat([lng, lat]));
        lineFeatures.push(
          new ol.Feature({
            geometry: new ol.geom.LineString(projected),
            kind: "route-segment",
            congestion: seg.congestionLevel,
          })
        );
      }
    } else {
      lineFeatures.push(
        new ol.Feature({
          geometry: new ol.geom.LineString(projectedAll),
          kind: "route",
        })
      );
    }

    const features = [
      ...lineFeatures,
      new ol.Feature({
        geometry: new ol.geom.Point(projectedAll[0]),
        kind: "start",
      }),
      new ol.Feature({
        geometry: new ol.geom.Point(projectedAll[projectedAll.length - 1]),
        kind: "end",
      }),
    ];

    const layer = new ol.layer.Vector({
      source: new ol.source.Vector({ features }),
      style: (feature: {
        get: (key: string) => string | number | undefined;
      }) => {
        const kind = feature.get("kind");
        if (kind === "start") return pointStyle(ol, "#22c55e");
        if (kind === "end") return pointStyle(ol, "#ef4444");

        const congestion = feature.get("congestion");
        const color =
          typeof congestion === "number"
            ? getCongestionColor(congestion as 0 | 1 | 2 | 3 | 4)
            : "#2563eb";

        return new ol.style.Style({
          stroke: new ol.style.Stroke({ color, width: 5 }),
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
    mode: MapDisplayMode,
    displayMode: RouteLineWidthMode = "overview"
  ) {
    if (mode === "2d") {
      if (!map2d) return;
      this.drawRoute2D(map2d, route);
      return;
    }
    this.drawRoute3D(vw, map, route, displayMode);
  }

  private addPoint3D(
    vw: VWorldNamespace,
    id: string,
    lng: number,
    lat: number,
    altM: number,
    r: number,
    g: number,
    b: number
  ) {
    if (!vw.geom?.PointZ) return;

    const point = new vw.geom.PointZ(new vw.CoordZ(lng, lat, altM));
    point.setId?.(id);
    point.setFillColor?.(new vw.Color(r, g, b, 255));
    point.setOutLineColor?.(new vw.Color(0, 0, 0, 255));
    this.addStatic(point);
  }

  syncVehicle3D(
    vw: VWorldNamespace,
    pos: RoutePosition | null,
    show: boolean,
    traveledM = 0,
    surfaceState?: DrivingSurfaceState | null
  ) {
    this.vehicleModelOverlay.sync(vw, pos, show, traveledM, surfaceState);
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
    const style = vehicleIconStyle(ol, pos.bearing);

    if (!this.olVehicleFeature) {
      this.olVehicleFeature = new ol.Feature({
        geometry: new ol.geom.Point(coord),
      }) as {
        setGeometry(geometry: unknown): void;
        setStyle(style: unknown): void;
      };
      this.olVehicleFeature.setStyle(style);
      const layer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: [this.olVehicleFeature] }),
        zIndex: 110,
      });
      layer.set?.("id", VEHICLE_ID);
      map2d.addLayer(layer);
      this.olVehicleLayer = layer;
      return;
    }

    this.olVehicleFeature.setGeometry(new ol.geom.Point(coord));
    this.olVehicleFeature.setStyle(style);
  }

  syncVehicle(
    vw: VWorldNamespace,
    map2d: VWorldOlMap | null,
    pos: RoutePosition | null,
    show: boolean,
    mode: MapDisplayMode,
    traveledM = 0,
    surfaceState?: DrivingSurfaceState | null
  ) {
    if (mode === "2d") {
      this.vehicleModelOverlay.sync(vw, null, false);
      if (map2d) this.syncVehicle2D(map2d, pos, show);
      return;
    }
    if (map2d) this.syncVehicle2D(map2d, null, false);
    this.syncVehicle3D(vw, pos, show, traveledM, surfaceState);
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
