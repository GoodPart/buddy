import type { Viewer } from "cesium";

type CesiumModule = typeof import("cesium");

/** 3D 모드 바닥 단색 */
export const GROUND_COLOR_3D = "#73777d";

export function applyGlobeAppearance(
  Cesium: CesiumModule,
  viewer: Viewer,
  mode: "2d" | "3d"
) {
  const layers = viewer.imageryLayers;
  for (let i = 0; i < layers.length; i++) {
    layers.get(i).show = mode === "2d";
  }

  if (mode === "3d") {
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(GROUND_COLOR_3D);
    viewer.scene.globe.enableLighting = false;
    return;
  }

  viewer.scene.globe.baseColor = Cesium.Color.WHITE;
  viewer.scene.globe.enableLighting = true;
}
