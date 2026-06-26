// GET  /api/tmap/geocode?q=  (주소 검색)

import { NextResponse } from "next/server";
import { tmapFetch } from "@/lib/tmap/client";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ message: "검색어가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await tmapFetch<{
      coordinateInfo?: { coordinate?: Array<{
        newLat: string;
        newLon: string;
        fullAddr?: string;
        roadName?: string;
      }> };
    }>("/tmap/geo/fullAddrGeo", {
      method: "GET",
      searchParams: {
        version: "1",
        format: "json",
        addressFlag: "F02",
        fullAddr: q,
        count: "10",
      },
    });

    const list = data.coordinateInfo?.coordinate ?? [];
    const results = (Array.isArray(list) ? list : [list])
      .filter((c) => c?.newLat && c?.newLon)
      .map((c) => ({
        name: c.roadName || q,
        lat: parseFloat(c.newLat),
        lng: parseFloat(c.newLon),
        address: c.fullAddr,
      }));

    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("1100") || message.includes("A2C500")) {
      return NextResponse.json({ results: [] });
    }
    console.error(e);
    return NextResponse.json({ message: "지오코딩 실패" }, { status: 502 });
  }
}