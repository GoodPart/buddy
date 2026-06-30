import type { RadioStationQuery } from "./types";

const RADIO_BSOD_ORIGIN = "https://radio.bsod.kr";

export function buildRadioStreamUrl(query: RadioStationQuery): string {
  const url = new URL("/stream/static", RADIO_BSOD_ORIGIN);
  url.searchParams.set("stn", query.stn);
  if (query.ch) url.searchParams.set("ch", query.ch);
  if (query.city) url.searchParams.set("city", query.city);
  return url.toString();
}
