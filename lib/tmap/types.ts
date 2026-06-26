export type Place = {
  name: string;
  lng: number;
  lat: number;
  address?: string;
};

/** Tmap Point feature 기반 턴-by-턴 안내 */
export type RouteGuidance = {
  index: number;
  pointIndex?: number;
  pointType: string;
  turnType?: number;
  turnLabel: string;
  name?: string;
  description: string;
  nextRoadName?: string;
  lng: number;
  lat: number;
  /** 출발지부터 이 안내점까지 경로상 거리(m) */
  distanceAlongRoute: number;
};

export type RouteResponse = {
  totalDistance: number;
  totalTime: number;
  totalFare?: number;
  taxiFare?: number;
  coordinates: [number, number][];
  /** 지도·시뮬레이션 공용 경로 (polyline과 마커가 동일 선상) */
  pathCoordinates: [number, number][];
  /** pathCoordinates 누적 길이(m) */
  pathDistance: number;
  segmentDistances: number[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  guidances: RouteGuidance[];
};
