export type MapDisplayMode = "2d" | "3d";

export const MAP_MODE_LABELS: Record<MapDisplayMode, string> = {
  "2d": "2D 지도",
  "3d": "3D 지도",
};

export function toVWorldMapMode(mode: MapDisplayMode): "2d-map" | "3d-map" {
  return mode === "2d" ? "2d-map" : "3d-map";
}
