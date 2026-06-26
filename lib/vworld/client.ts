import type { BBox } from "./bbox";

const BASE = "https://api.vworld.kr/req";

function getApiKey() {
  const key = process.env.VWORLD_API_KEY;
  if (!key) throw new Error("VWORLD_API_KEY is not set");
  return key;
}

/** 서버·비브라우저 호출 시 VWorld에 등록한 domain (예: localhost) */
function getDomain() {
  return process.env.VWORLD_API_DOMAIN ?? "localhost";
}

export type VWorldGeoJson = {
  type: "FeatureCollection";
  features: GeoJSON.Feature[];
  totalFeatures?: number;
};

function parseWfsError(text: string): string | null {
  if (!text.startsWith("<?xml") && !text.startsWith("<")) return null;
  const match = text.match(/<ServiceException[^>]*>([^<]+)<\/ServiceException>/);
  return match?.[1]?.trim() ?? "VWorld WFS error";
}

export async function vworldWfsGetFeature(params: {
  typename: string;
  bbox: BBox;
  maxFeatures?: number;
}): Promise<VWorldGeoJson> {
  const url = new URL(`${BASE}/wfs`);
  url.searchParams.set("key", getApiKey());
  url.searchParams.set("domain", getDomain());
  url.searchParams.set("service", "WFS");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("TYPENAME", params.typename);
  url.searchParams.set("SRSNAME", "EPSG:4326");
  url.searchParams.set("BBOX", params.bbox.join(","));
  url.searchParams.set("OUTPUT", "application/json");
  url.searchParams.set("MAXFEATURES", String(params.maxFeatures ?? 300));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const text = await res.text();

  const wfsError = parseWfsError(text);
  if (wfsError) {
    throw new Error(wfsError);
  }
  if (!res.ok) {
    throw new Error(`VWorld WFS HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return JSON.parse(text) as VWorldGeoJson;
}
