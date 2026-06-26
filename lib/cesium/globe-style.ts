import type { Viewer } from "cesium";

type CesiumModule = typeof import("cesium");

export function applyGlobeAppearance(
  Cesium: CesiumModule,
  viewer: Viewer,
  mode: "2d" | "3d"
) {
  const layers = viewer.imageryLayers;
  for (let i = 0; i < layers.length; i++) {
    layers.get(i).show = true;
  }

  viewer.scene.globe.baseColor = Cesium.Color.WHITE;
  viewer.scene.globe.enableLighting = mode === "2d";
}
