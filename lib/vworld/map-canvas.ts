import type { MapDisplayMode } from "./map-mode";

const MAP2D_ROOT_ID = "map2d";
const MAP3D_ROOT_ID = "map3d";

function canvasDisplayArea(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

/** 현재 표시 중인 지도의 주 canvas (WebGL / OpenLayers) */
export function findActiveMapCanvas(
  mode: MapDisplayMode
): HTMLCanvasElement | null {
  const rootId = mode === "2d" ? MAP2D_ROOT_ID : MAP3D_ROOT_ID;
  const root = document.getElementById(rootId);
  if (!root) return null;

  const preferred =
    mode === "3d"
      ? root.querySelector<HTMLCanvasElement>(".cesium-widget canvas")
      : root.querySelector<HTMLCanvasElement>("canvas");

  if (preferred && canvasDisplayArea(preferred) > 0) {
    return preferred;
  }

  const canvases = Array.from(root.querySelectorAll("canvas")).filter(
    (c) => canvasDisplayArea(c) > 0
  );

  if (!canvases.length) return null;

  return canvases.reduce((best, cur) =>
    canvasDisplayArea(cur) > canvasDisplayArea(best) ? cur : best
  );
}
