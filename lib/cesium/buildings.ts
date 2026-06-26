import type { Viewer } from "cesium";
import { getCesiumIonTokenIssue } from "./setup";

/** 값이 클수록 가볍게 렌더 (기본 16) */
export const BUILDINGS_MAX_SCREEN_SPACE_ERROR = 24;

type CesiumModule = typeof import("cesium");

function formatLoadError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as { message?: unknown; statusCode?: unknown };
    if (obj.message != null) return String(obj.message);
    if (obj.statusCode != null) return `HTTP ${obj.statusCode}`;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

export async function loadOsmBuildings(
  Cesium: CesiumModule,
  viewer: Viewer
): Promise<import("cesium").Cesium3DTileset | null> {
  const tokenIssue = getCesiumIonTokenIssue();
  if (tokenIssue) {
    console.warn(`3D 건물 타일 로드 건너뜀: ${tokenIssue}`);
    return null;
  }

  try {
    const tileset = await Cesium.createOsmBuildingsAsync({
      defaultColor: Cesium.Color.WHITE,
      style: new Cesium.Cesium3DTileStyle({
        color: "color('white', 1.0)",
      }),
      showOutline: false,
    });
    tileset.maximumScreenSpaceError = BUILDINGS_MAX_SCREEN_SPACE_ERROR;
    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch (e) {
    console.warn("3D 건물 타일 로드 실패:", formatLoadError(e));
    return null;
  }
}
