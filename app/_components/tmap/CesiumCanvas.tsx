"use client";

import { destination } from "@turf/turf";
import { useEffect, useRef, useState } from "react";
import type { RoutePosition, RouteResponse } from "@/lib/tmap/types";
import { getRouteCoords } from "@/lib/tmap/route-line";
import { loadOsmBuildings } from "@/lib/cesium/buildings";
import { applyGlobeAppearance } from "@/lib/cesium/globe-style";
import {
  clearVWorldBuildings,
  loadVWorldBuildingsForRoute,
  setVWorldBuildingsVisible,
} from "@/lib/cesium/vworld-buildings";
import type { MapDisplayMode } from "@/lib/cesium/map-mode";
import { configureCesiumBaseUrl, getCesiumIonToken, isCesiumIonTokenValid } from "@/lib/cesium/setup";
import { useMapModeStore, useSimulationStore } from "@/stores";
import MapModeToggle from "@/app/_components/tmap/MapModeToggle";
import RouteGuidanceOverlay from "@/app/_components/tmap/RouteGuidanceOverlay";

type CesiumModule = typeof import("cesium");
type Viewer = import("cesium").Viewer;
type Entity = import("cesium").Entity;
type Cesium3DTileset = import("cesium").Cesium3DTileset;

const ROUTE_ID = "route-line";
const START_ID = "start-marker";
const END_ID = "end-marker";
const VEHICLE_ID = "vehicle-marker";

/** 차량 뒤 거리(m) */
const CHASE_RANGE_M = 20;
/** 지형 위 카메라 높이(m) */
const CHASE_CAMERA_HEIGHT_M = 8;
/** 진행 방향(도착지) 쪽으로 내려다보는 각도 — 값이 클수록(0에 가까울수록) 전방을 더 봄 */
const CHASE_PITCH_DEG = -14.4;
const FOLLOW_HEIGHT_2D_M = 1800;

type SimViewState = {
  vehiclePos: RoutePosition | null;
  followCamera: boolean;
  showVehicle: boolean;
  mapMode: MapDisplayMode;
};

function flatDegrees(coords: [number, number][]): number[] {
  const out: number[] = [];
  for (const [lng, lat] of coords) {
    out.push(lng, lat);
  }
  return out;
}

function removeEntity(viewer: Viewer, id: string) {
  const entity = viewer.entities.getById(id);
  if (entity) viewer.entities.remove(entity);
}

function clearRouteEntities(viewer: Viewer) {
  for (const id of [ROUTE_ID, START_ID, END_ID, VEHICLE_ID]) {
    removeEntity(viewer, id);
  }
  clearVWorldBuildings(viewer);
}

async function loadRouteBuildings(
  Cesium: CesiumModule,
  viewer: Viewer,
  route: RouteResponse,
  tileset: Cesium3DTileset | null,
  useVWorldRef: { current: boolean }
) {
  useVWorldRef.current = false;
  if (tileset) tileset.show = true;

  try {
    const count = await loadVWorldBuildingsForRoute(Cesium, viewer, route);
    if (count > 0) {
      useVWorldRef.current = true;
      if (tileset) tileset.show = false;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      if (useMapModeStore.getState().mode === "2d") {
        setVWorldBuildingsVisible(viewer, false);
      }
      viewer.scene.requestRender();
      return;
    }
  } catch (e) {
    console.warn("VWorld 건물 로드 실패, OSM Buildings 유지:", e);
  }

  clearVWorldBuildings(viewer);
}

async function loadCesium(): Promise<CesiumModule> {
  configureCesiumBaseUrl();
  const Cesium = await import("cesium");
  await import("cesium/Build/Cesium/Widgets/widgets.css");

  const token = getCesiumIonToken();
  if (token && isCesiumIonTokenValid()) {
    Cesium.Ion.defaultAccessToken = token;
  }
  return Cesium;
}

function ellipsoidTerrain(Cesium: CesiumModule) {
  return new Cesium.Terrain(
    Promise.resolve(new Cesium.EllipsoidTerrainProvider())
  );
}

function applyMapMode(
  Cesium: CesiumModule,
  viewer: Viewer,
  mode: MapDisplayMode,
  tileset: Cesium3DTileset | null,
  useVWorldBuildings: boolean
) {
  if (mode === "2d") {
    if (tileset) tileset.show = false;
    setVWorldBuildingsVisible(viewer, false);
    viewer.scene.setTerrain(ellipsoidTerrain(Cesium));
    viewer.scene.globe.depthTestAgainstTerrain = false;
    applyGlobeAppearance(Cesium, viewer, "2d");
    viewer.scene.morphTo2D(0.6);
    return;
  }

  if (isCesiumIonTokenValid()) {
    viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
    if (tileset) tileset.show = !useVWorldBuildings;
  } else if (tileset) {
    tileset.show = false;
  }
  setVWorldBuildingsVisible(viewer, useVWorldBuildings);
  // Entity/Primitive extrusion은 지형 depth test와 충돌할 수 있음
  viewer.scene.globe.depthTestAgainstTerrain =
    isCesiumIonTokenValid() && !useVWorldBuildings;
  applyGlobeAppearance(Cesium, viewer, "3d");
  viewer.scene.morphTo3D(0.6);
}

async function createViewer(
  Cesium: CesiumModule,
  container: HTMLDivElement,
  initialMode: MapDisplayMode
): Promise<{ viewer: Viewer; tileset: Cesium3DTileset | null }> {
  const hasValidToken = isCesiumIonTokenValid();

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrain: ellipsoidTerrain(Cesium),
    ...(hasValidToken
      ? {}
      : {
          baseLayer: new Cesium.ImageryLayer(
            new Cesium.UrlTemplateImageryProvider({
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              credit: "© OpenStreetMap contributors",
            })
          ),
        }),
  });

  const tileset = await loadOsmBuildings(Cesium, viewer);
  applyMapMode(Cesium, viewer, initialMode, tileset, false);

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(126.978, 37.5665, 12000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
  });

  return { viewer, tileset };
}

function drawRoute(
  Cesium: CesiumModule,
  viewer: Viewer,
  route: RouteResponse
) {
  clearRouteEntities(viewer);

  const coords = getRouteCoords(route);
  if (coords.length < 2) return;

  viewer.entities.add({
    id: ROUTE_ID,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(flatDegrees(coords)),
      width: 5,
      material: Cesium.Color.fromCssColorString("#2563eb"),
      clampToGround: true,
    },
  });

  const [startLng, startLat] = coords[0];
  const [endLng, endLat] = coords[coords.length - 1];

  viewer.entities.add({
    id: START_ID,
    position: Cesium.Cartesian3.fromDegrees(startLng, startLat),
    point: {
      pixelSize: 12,
      color: Cesium.Color.LIME,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "출발",
      font: "13px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  viewer.entities.add({
    id: END_ID,
    position: Cesium.Cartesian3.fromDegrees(endLng, endLat),
    point: {
      pixelSize: 12,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "도착",
      font: "13px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  viewer.camera.cancelFlight();
  viewer.flyTo(viewer.entities, { duration: 1.2 });
}

function ensureVehicleEntity(
  Cesium: CesiumModule,
  viewer: Viewer
): Entity {
  let entity = viewer.entities.getById(VEHICLE_ID);
  if (entity?.model) {
    viewer.entities.remove(entity);
    entity = undefined;
  }
  if (entity) return entity;

  entity = viewer.entities.add({
    id: VEHICLE_ID,
    position: Cesium.Cartesian3.fromDegrees(0, 0),
    point: {
      pixelSize: 16,
      color: Cesium.Color.fromCssColorString("#1d4ed8"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  return entity;
}

function updateVehicleTransform(
  Cesium: CesiumModule,
  entity: Entity,
  pos: RoutePosition
) {
  entity.position = new Cesium.ConstantPositionProperty(
    Cesium.Cartesian3.fromDegrees(pos.lng, pos.lat)
  );
  entity.orientation = undefined;
}

function resolveTerrainHeight(
  Cesium: CesiumModule,
  viewer: Viewer,
  lng: number,
  lat: number
): number {
  const carto = Cesium.Cartographic.fromDegrees(lng, lat);
  const terrainHeight = viewer.scene.globe.getHeight(carto);
  return terrainHeight != null && Number.isFinite(terrainHeight)
    ? terrainHeight
    : 0;
}

function followCamera(
  Cesium: CesiumModule,
  viewer: Viewer,
  pos: RoutePosition,
  mapMode: MapDisplayMode
) {
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

  if (mapMode === "2d") {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        pos.lng,
        pos.lat,
        FOLLOW_HEIGHT_2D_M
      ),
    });
    return;
  }

  const behindBearing = (pos.bearing + 180) % 360;
  const behind = destination(
    [pos.lng, pos.lat],
    CHASE_RANGE_M / 1000,
    behindBearing,
    { units: "kilometers" }
  );
  const [camLng, camLat] = behind.geometry.coordinates;
  const terrainH = resolveTerrainHeight(Cesium, viewer, camLng, camLat);

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      camLng,
      camLat,
      terrainH + CHASE_CAMERA_HEIGHT_M
    ),
    orientation: {
      heading: Cesium.Math.toRadians(pos.bearing),
      pitch: Cesium.Math.toRadians(CHASE_PITCH_DEG),
      roll: 0,
    },
  });
}

function syncVehicleAndCamera(
  Cesium: CesiumModule,
  viewer: Viewer,
  sim: SimViewState
) {
  if (!sim.showVehicle || !sim.vehiclePos) {
    removeEntity(viewer, VEHICLE_ID);
    return;
  }

  const pos = sim.vehiclePos;
  const entity = ensureVehicleEntity(Cesium, viewer);
  updateVehicleTransform(Cesium, entity, pos);
  entity.show = true;

  if (!sim.followCamera) return;
  followCamera(Cesium, viewer, pos, sim.mapMode);
}

function toSimViewState(
  status: string,
  pos: RoutePosition | null,
  mapMode: MapDisplayMode
): SimViewState {
  const showVehicle =
    pos != null &&
    (status === "running" || status === "paused" || status === "arrived");

  return {
    vehiclePos: pos,
    followCamera: status === "running",
    showVehicle,
    mapMode,
  };
}

export default function CesiumCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const tilesetRef = useRef<Cesium3DTileset | null>(null);
  const useVWorldBuildingsRef = useRef(false);
  const mapMode = useMapModeStore((s) => s.mode);
  const simRef = useRef<SimViewState>({
    vehiclePos: null,
    followCamera: false,
    showVehicle: false,
    mapMode: "3d",
  });
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const initialMode = useMapModeStore.getState().mode;

    loadCesium()
      .then(async (Cesium) => {
        if (cancelled) return;
        cesiumRef.current = Cesium;
        const { viewer, tileset } = await createViewer(
          Cesium,
          container,
          initialMode
        );
        viewerRef.current = viewer;
        tilesetRef.current = tileset;
        simRef.current.mapMode = initialMode;
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "지도 로드 실패");
        }
      });

    return () => {
      cancelled = true;
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
      tilesetRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    simRef.current.mapMode = mapMode;
    applyMapMode(
      Cesium,
      viewer,
      mapMode,
      tilesetRef.current,
      useVWorldBuildingsRef.current
    );
  }, [mapMode, ready]);

  useEffect(() => {
    if (!ready) return;

    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    const onPreRender = () => {
      if (viewer.isDestroyed()) return;
      syncVehicleAndCamera(Cesium, viewer, simRef.current);
    };
    viewer.scene.preRender.addEventListener(onPreRender);

    const schedule = (fn: () => void) => {
      window.setTimeout(fn, 50);
    };

    const unsubSim = useSimulationStore.subscribe((state, prev) => {
      const v = viewerRef.current;
      const c = cesiumRef.current;
      if (!v || !c || v.isDestroyed()) return;

      simRef.current = toSimViewState(
        state.status,
        state.currentPosition,
        simRef.current.mapMode
      );

      if (state.route !== prev.route) {
        schedule(() => {
          if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
          if (!state.route) {
            clearRouteEntities(viewerRef.current);
            useVWorldBuildingsRef.current = false;
            if (tilesetRef.current) {
              tilesetRef.current.show =
                simRef.current.mapMode === "3d" && isCesiumIonTokenValid();
            }
            viewerRef.current.scene.globe.depthTestAgainstTerrain =
              simRef.current.mapMode === "3d" && isCesiumIonTokenValid();
            simRef.current = {
              vehiclePos: null,
              followCamera: false,
              showVehicle: false,
              mapMode: simRef.current.mapMode,
            };
            return;
          }
          try {
            drawRoute(c, viewerRef.current, state.route);
            void loadRouteBuildings(
              c,
              viewerRef.current,
              state.route,
              tilesetRef.current,
              useVWorldBuildingsRef
            );
          } catch (e) {
            console.warn("경로 표시 실패:", e);
          }
        });
        return;
      }

      if (state.status === "running" && prev.status !== "running") {
        v.camera.cancelFlight();
      }
    });

    return () => {
      unsubSim();
      if (!viewer.isDestroyed()) {
        viewer.scene.preRender.removeEventListener(onPreRender);
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };
  }, [ready]);

  if (loadError) {
    return (
      <div className="h-[400px] flex items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 text-sm text-red-700 p-4 text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] rounded-md overflow-hidden border border-gray-300 bg-gray-900">
      <MapModeToggle />
      <RouteGuidanceOverlay />
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
