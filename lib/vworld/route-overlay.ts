import type { RouteResponse } from "@/lib/tmap/types";
import type { RoutePosition } from "@/lib/tmap/types";
import { getRouteCoords } from "@/lib/tmap/route-line";
import type { VWorldGeometry, VWorldMapInstance, VWorldNamespace } from "./global.d";

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

export class VWorldRouteOverlay {
  private staticGeometries: VWorldGeometryInstance[] = [];
  private vehicleGeometry: VWorldGeometryInstance | null = null;

  clear(map: VWorldMapInstance) {
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

  private addStatic(geometry: VWorldGeometryInstance) {
    geometry.create();
    this.staticGeometries.push(geometry);
  }

  drawRoute(vw: VWorldNamespace, map: VWorldMapInstance, route: RouteResponse) {
    this.clear(map);

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
    this.addPoint(vw, START_ID, startLng, startLat, 0, 255, 0);
    this.addPoint(vw, END_ID, endLng, endLat, 255, 0, 0);
  }

  private addPoint(
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

  syncVehicle(vw: VWorldNamespace, pos: RoutePosition | null, show: boolean) {
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

  flyToRoute(vw: VWorldNamespace, map: VWorldMapInstance, route: RouteResponse) {
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
}

export function enable3DBuildings(map: VWorldMapInstance) {
  try {
    map.getLayerElement?.("facility_build")?.show?.();
  } catch {
    /* optional layer */
  }
}
