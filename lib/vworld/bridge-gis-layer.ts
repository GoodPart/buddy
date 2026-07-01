/**
 * ② GIS 교량 Polygon 레이어 — Bridge Mesh 없을 때 deckHeight 제공
 */

export type BridgeGisZone = {
  id: string;
  polygon: [number, number][];
  deckAbsoluteM: number;
};

export type BridgeGisLookup = {
  zoneId: string;
  deckAbsoluteM: number;
};

export interface BridgeGisProvider {
  lookup(lng: number, lat: number): BridgeGisLookup | null;
}

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  if (ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export class BridgeGisPolygonProvider implements BridgeGisProvider {
  constructor(private zones: BridgeGisZone[] = []) {}

  setZones(zones: BridgeGisZone[]): void {
    this.zones = zones;
  }

  lookup(lng: number, lat: number): BridgeGisLookup | null {
    for (const zone of this.zones) {
      if (pointInRing(lng, lat, zone.polygon)) {
        return { zoneId: zone.id, deckAbsoluteM: zone.deckAbsoluteM };
      }
    }
    return null;
  }
}

export const bridgeGisProvider: BridgeGisProvider = new BridgeGisPolygonProvider();
