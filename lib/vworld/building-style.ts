import type { VWorldBuildingFootprint } from "@/lib/vworld/parse-buildings";

/** WFS footprint extrusion — 텍스처 없이 층수·높이로 색만 구분 */
export function buildingColorCss(building: VWorldBuildingFootprint): string {
  const { floors, heightM } = building;

  // 고층: 블루그레이 / 저층: warm beige
  if (floors >= 10 || heightM >= 35) return "#8f9bab";
  if (floors >= 5 || heightM >= 18) return "#a8b0bc";
  if (floors >= 3 || heightM >= 10) return "#c2c8d0";
  if (floors >= 2 || heightM >= 7) return "#d8dce2";
  return "#e8e2d8";
}
