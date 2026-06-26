import { NextResponse } from "next/server";
import type { BBox } from "@/lib/vworld/bbox";
import { vworldWfsGetFeature } from "@/lib/vworld/client";
import { parseSpbdGeoJson } from "@/lib/vworld/parse-buildings";

const SPBD_TYPENAME = "lt_c_spbd";

function parseBBox(value: string | null): BBox | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) return null;
  return [west, south, east, north];
}

export async function GET(request: Request) {
  const bbox = parseBBox(new URL(request.url).searchParams.get("bbox"));
  if (!bbox) {
    return NextResponse.json(
      { message: "bbox=west,south,east,north 형식이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const geojson = await vworldWfsGetFeature({
      typename: SPBD_TYPENAME,
      bbox,
      maxFeatures: 300,
    });
    const buildings = parseSpbdGeoJson(geojson);

    return NextResponse.json({
      buildings,
      totalFeatures: geojson.totalFeatures ?? buildings.length,
      typename: SPBD_TYPENAME,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "VWorld WFS 요청 실패";
    return NextResponse.json({ message }, { status: 502 });
  }
}
