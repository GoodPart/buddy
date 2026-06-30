import type { MapDisplayMode } from "./map-mode";
import { getVw } from "./load-sdk";
import type { VWorldMapController, VWorldMapInstance, VWorldNamespace } from "./global.d";

function hideDefault3DLayers(map: VWorldMapInstance | null | undefined) {
  if (!map) return;
  try {
    map.getLayerElement?.("facility_build")?.hide?.();
  } catch {
    /* optional layer */
  }
}

function getInitialAltitude(): number {
  if (typeof window === "undefined") return 1_700_700;
  const width = window.innerWidth;
  if (width >= 1500) return 2_100_700;
  if (width >= 1200) return 1_700_700;
  return 1_350_700;
}

/**
 * MapController(2D+3D)는 Next.js 환경에서 2D 컨트롤 초기화 오류가 날 수 있어
 * 공식 3D API(vw.Map + start)로 직접 초기화한다.
 */
export function createMapController(
  containerId: string,
  _initialMode: MapDisplayMode
): VWorldMapController {
  const vw = getVw();
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`지도 컨테이너를 찾을 수 없습니다: ${containerId}`);
  }

  container.innerHTML = "";

  const mapRoot = document.createElement("div");
  mapRoot.id = "map3d";
  mapRoot.className = "wsMapContainer";
  mapRoot.style.cssText =
    "display:block;position:relative;width:100%;height:100%;border:0;overflow:hidden;";
  container.appendChild(mapRoot);

  const initPosition = new vw.CameraPosition(
    new vw.CoordZ(126.978, 37.5665, getInitialAltitude()),
    new vw.Direction(0, -90, 0)
  );

  const map3d = new vw.Map({
    mapId: "map3d",
    initPosition,
    logo: false,
    navigation: false,
    isZoomControl: false,
  } as Record<string, unknown>);

  map3d.start?.();
  hideDefault3DLayers(map3d);

  return {
    Map3D: map3d,
    setMode: (mode) => {
      if (mode === "2d-map") {
        console.warn("2D 모드는 현재 3D 전용 초기화에서는 지원되지 않습니다.");
      }
    },
  };
}

export function getMap3D(controller: VWorldMapController): VWorldMapInstance | null {
  return controller.Map3D ?? null;
}
