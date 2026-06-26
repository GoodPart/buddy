import { NextResponse } from "next/server";
import { tmapFetch } from "@/lib/tmap/client";
import { parseTmapRoute } from "@/lib/tmap/parse-route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      startLng,
      startLat,
      endLng,
      endLat,
      startName = "출발",
      endName = "도착",
    } = body;

    if ([startLng, startLat, endLng, endLat].some((v) => v == null)) {
      return NextResponse.json(
        { message: "출발/도착 좌표가 필요합니다." },
        { status: 400 }
      );
    }

    const raw = await tmapFetch<unknown>("/tmap/routes?version=1", {
      method: "POST",
      body: JSON.stringify({
        startX: String(startLng),
        startY: String(startLat),
        endX: String(endLng),
        endY: String(endLat),
        startName,
        endName,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        searchOption: 0,
        trafficInfo: "Y",
      }),
    });

    const route = parseTmapRoute(raw as Parameters<typeof parseTmapRoute>[0]);
    return NextResponse.json(route);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "경로 탐색 실패" }, { status: 502 });
  }
}
