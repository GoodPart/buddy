import type { MapDisplayMode } from "./map-mode";
import { getVw } from "./load-sdk";
import type {
  VWorldMapController,
  VWorldMapInstance,
  VWorldOlMap,
} from "./global.d";

const MAP2D_ID = "map2d";
const MAP3D_ID = "map3d";

type CameraSync = {
  lng: number;
  lat: number;
  zoom: number;
};

function hideDefault3DLayers(map: VWorldMapInstance | null | undefined) {
  if (!map) return;
  try {
    map.getLayerElement?.("facility_build")?.hide?.();
  } catch {
    /* optional layer — 표시 시 Cesium RangeError 유발 가능 */
  }
}

function getInitialAltitude(): number {
  if (typeof window === "undefined") return 1_700_700;
  const width = window.innerWidth;
  if (width >= 1500) return 2_100_700;
  if (width >= 1200) return 1_700_700;
  return 1_350_700;
}

function setupOl3Camera(lng: number, lat: number, zoom: number) {
  const vw = getVw();
  const ol = (window as unknown as { ol?: { proj: { fromLonLat: (c: number[]) => number[] } } }).ol;
  if (!vw.ol3?.CameraPosition || !ol) return;

  vw.ol3.CameraPosition.center = ol.proj.fromLonLat([lng, lat]);
  vw.ol3.CameraPosition.zoom = zoom;
}

function setMapRootVisible(id: string, visible: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? "block" : "none";
  el.style.visibility = visible ? "visible" : "hidden";
}

function read3DCamera(map3d: VWorldMapInstance): CameraSync | null {
  try {
    const cur = (
      map3d as {
        getCurrentPosition?: () => {
          position: { x: number; y: number };
        };
      }
    ).getCurrentPosition?.();
    if (!cur) return null;
    return { lng: cur.position.x, lat: cur.position.y, zoom: 15 };
  } catch {
    return null;
  }
}

function read2DCamera(map2d: VWorldOlMap): CameraSync | null {
  try {
    const ol = (window as unknown as { ol?: { proj: { toLonLat: (c: number[]) => number[] } } }).ol;
    const center = map2d.getView().getCenter();
    const zoom = map2d.getView().getZoom();
    if (!ol || !center) return null;
    const [lng, lat] = ol.proj.toLonLat(center);
    return { lng, lat, zoom: Number.isFinite(zoom) ? zoom : 15 };
  } catch {
    return null;
  }
}

function flyMap3D(map3d: VWorldMapInstance, camera: CameraSync) {
  const vw = getVw();
  map3d.moveTo(
    new vw.CameraPosition(
      new vw.CoordZ(camera.lng, camera.lat, getInitialAltitude()),
      new vw.Direction(0, -90, 0)
    )
  );
}

function flyMap2D(map2d: VWorldOlMap, camera: CameraSync) {
  const ol = (window as unknown as { ol?: { proj: { fromLonLat: (c: number[]) => number[] } } }).ol;
  if (!ol) return;
  map2d.getView().setCenter(ol.proj.fromLonLat([camera.lng, camera.lat]));
  map2d.getView().setZoom(camera.zoom);
}

const MY_LOCATION_ZOOM = 17;
const MY_LOCATION_ALTITUDE_M = 2_500;

export function panToLocation(
  controller: VWorldMapController,
  mode: MapDisplayMode,
  lng: number,
  lat: number
) {
  const camera: CameraSync = { lng, lat, zoom: MY_LOCATION_ZOOM };

  if (mode === "2d") {
    if (!controller.Map2D) {
      controller.setMode("2d-map");
      refresh2DMap(controller);
    }
    const map2d = getMap2D(controller);
    if (map2d) flyMap2D(map2d, camera);
    return;
  }

  if (!controller.Map3D) {
    controller.setMode("3d-map");
  }
  const map3d = getMap3D(controller);
  if (!map3d) return;

  const vw = getVw();
  map3d.moveTo(
    new vw.CameraPosition(
      new vw.CoordZ(lng, lat, MY_LOCATION_ALTITUDE_M),
      new vw.Direction(0, -90, 0)
    )
  );
}

function createMap3D(container: HTMLElement): VWorldMapInstance {
  const vw = getVw();

  const mapRoot = document.createElement("div");
  mapRoot.id = MAP3D_ID;
  mapRoot.className = "wsMapContainer";
  mapRoot.style.cssText =
    "display:block;position:relative;width:100%;height:100%;border:0;overflow:hidden;";
  container.appendChild(mapRoot);

  const map3d = new vw.Map({
    mapId: MAP3D_ID,
    initPosition: new vw.CameraPosition(
      new vw.CoordZ(126.978, 37.5665, getInitialAltitude()),
      new vw.Direction(0, -90, 0)
    ),
    logo: false,
    navigation: false,
    isZoomControl: false,
  } as Record<string, unknown>);

  map3d.start?.();
  hideDefault3DLayers(map3d);
  return map3d;
}

function createMap2D(container: HTMLElement): VWorldOlMap {
  const vw = getVw();
  if (!vw.ol3?.Map) {
    throw new Error("VWorld 2D 지도 API를 사용할 수 없습니다.");
  }

  const mapRoot = document.createElement("div");
  mapRoot.id = MAP2D_ID;
  mapRoot.style.cssText =
    "display:block;position:relative;width:100%;height:100%;border:0;overflow:hidden;";
  container.appendChild(mapRoot);

  setupOl3Camera(126.978, 37.5665, 15);

  return new vw.ol3.Map(MAP2D_ID, {
    basemapType: vw.ol3.BasemapType.GRAPHIC,
    controlDensity: vw.ol3.DensityType.EMPTY,
    interactionDensity: vw.ol3.DensityType.BASIC,
    controlsAutoArrange: true,
    homePosition: vw.ol3.CameraPosition,
    initPosition: vw.ol3.CameraPosition,
  });
}

/**
 * vw.MapController 대신 2D/3D를 **지연 초기화**한다.
 * MapController는 양쪽을 동시에 띄우며 Cesium RangeError를 유발할 수 있다.
 */
export function createMapController(
  containerId: string,
  initialMode: MapDisplayMode
): VWorldMapController {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`지도 컨테이너를 찾을 수 없습니다: ${containerId}`);
  }

  container.innerHTML = "";

  let map2d: VWorldOlMap | null = null;
  let map3d: VWorldMapInstance | null = null;
  let activeMode: MapDisplayMode = initialMode;
  let camera: CameraSync = { lng: 126.978, lat: 37.5665, zoom: 15 };

  function ensure3D(): VWorldMapInstance {
    if (!map3d) {
      map3d = createMap3D(container);
      flyMap3D(map3d, camera);
    }
    return map3d;
  }

  function ensure2D(): VWorldOlMap {
    if (!map2d) {
      map2d = createMap2D(container);
      flyMap2D(map2d, camera);
    }
    return map2d;
  }

  function applyMode(mode: MapDisplayMode) {
    if (mode === "3d") {
      if (map2d) {
        const synced = read2DCamera(map2d);
        if (synced) camera = synced;
      }
      setMapRootVisible(MAP2D_ID, false);
      ensure3D();
      setMapRootVisible(MAP3D_ID, true);
    } else {
      if (map3d) {
        const synced = read3DCamera(map3d);
        if (synced) camera = synced;
      }
      setMapRootVisible(MAP3D_ID, false);
      ensure2D();
      setMapRootVisible(MAP2D_ID, true);
      refresh2DMap(controller);
    }
    activeMode = mode;
  }

  const controller: VWorldMapController = {
    get Map2D() {
      return map2d;
    },
    get Map3D() {
      return map3d;
    },
    get mapMode() {
      return activeMode === "2d" ? "2d-map" : "3d-map";
    },
    setMode(mode) {
      applyMode(mode === "2d-map" ? "2d" : "3d");
    },
    updateMapSize() {
      map2d?.updateSize?.();
    },
  };

  applyMode(initialMode);
  return controller;
}

export function getMap2D(
  controller: VWorldMapController
): VWorldOlMap | null {
  return controller.Map2D ?? null;
}

export function getMap3D(
  controller: VWorldMapController
): VWorldMapInstance | null {
  return controller.Map3D ?? null;
}

/** 2D 맵이 display:none 상태에서 생성되면 OL 캔버스가 0×0이 될 수 있음 */
export function refresh2DMap(controller: VWorldMapController | null) {
  const map2d = controller ? getMap2D(controller) : null;
  if (!map2d) return;

  const olMap = map2d as {
    getTarget?: () => HTMLElement | string | null;
    setTarget?: (target: HTMLElement | string | null) => void;
    updateSize?: () => void;
    getView?: () => {
      getCenter: () => number[] | null;
      setCenter: (c: number[]) => void;
      setZoom: (z: number) => void;
    };
  };

  const target = olMap.getTarget?.() ?? null;
  if (!target) return;

  try {
    olMap.setTarget?.(null);
    olMap.setTarget?.(target);
    olMap.updateSize?.();

    const ol = (
      window as unknown as {
        ol?: { proj: { fromLonLat: (c: number[]) => number[] } };
      }
    ).ol;
    const view = olMap.getView?.();
    if (!view || !ol) return;

    const center = view.getCenter();
    if (!center || center.some((v) => v == null || !Number.isFinite(v))) {
      view.setCenter(ol.proj.fromLonLat([126.978, 37.5665]));
      view.setZoom(15);
    }
  } catch {
    /* ignore */
  }
}

export function resizeMaps(
  controller: VWorldMapController | null,
  mode?: MapDisplayMode
) {
  if (!controller) return;

  const run = () => {
    try {
      controller.updateMapSize?.(0, 0);
    } catch {
      /* ignore */
    }

    if (mode === "2d") {
      refresh2DMap(controller);
    }

    window.dispatchEvent(new Event("resize"));

    const widget = document
      .getElementById(MAP3D_ID)
      ?.querySelector(".cesium-widget") as
      | (HTMLElement & { cesiumWidget?: { resize?: () => void } })
      | null;
    widget?.cesiumWidget?.resize?.();
  };

  window.requestAnimationFrame(run);
  window.setTimeout(run, 120);
  window.setTimeout(run, 320);
}
