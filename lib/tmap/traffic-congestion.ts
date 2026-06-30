import type { RouteLinkSegment, TrafficCongestionLevel } from "./types";

/** Tmap 혼잡도 코드 → 라벨 */
export const CONGESTION_LABELS: Record<TrafficCongestionLevel, string> = {
  0: "정보 없음",
  1: "원활",
  2: "서행",
  3: "지체",
  4: "정체",
};

/** 지도·UI용 색 (hex) */
export const CONGESTION_COLORS: Record<TrafficCongestionLevel, string> = {
  0: "#2563eb",
  1: "#22c55e",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
};

export function getCongestionLabel(level: TrafficCongestionLevel): string {
  return CONGESTION_LABELS[level] ?? CONGESTION_LABELS[0];
}

export function getCongestionColor(level: TrafficCongestionLevel): string {
  return CONGESTION_COLORS[level] ?? CONGESTION_COLORS[0];
}

export function parseTrafficCongestion(
  raw: unknown,
  speedKmh?: number
): TrafficCongestionLevel {
  if (typeof raw === "number" && raw >= 0 && raw <= 4) {
    return raw as TrafficCongestionLevel;
  }

  if (typeof raw === "string" && raw.trim()) {
    const cleaned = raw.replace(/^\[|\]$/g, "").trim();
    const parts = cleaned.split(",").map((s) => s.trim());
    if (parts.length >= 3) {
      const level = Number(parts[2]);
      if (!Number.isNaN(level) && level >= 0 && level <= 4) {
        return level as TrafficCongestionLevel;
      }
    }
  }

  if (Array.isArray(raw) && raw.length >= 3) {
    const level = Number(raw[2]);
    if (!Number.isNaN(level) && level >= 0 && level <= 4) {
      return level as TrafficCongestionLevel;
    }
  }

  return inferCongestionFromSpeed(speedKmh);
}

/** speed만 있을 때 혼잡도 추정 (Tmap traffic 필드 없을 때 fallback) */
export function inferCongestionFromSpeed(speedKmh?: number): TrafficCongestionLevel {
  if (speedKmh == null || speedKmh <= 0) return 0;
  if (speedKmh >= 70) return 1;
  if (speedKmh >= 45) return 2;
  if (speedKmh >= 25) return 3;
  return 4;
}

export function congestionToRgb(
  level: TrafficCongestionLevel
): { r: number; g: number; b: number } {
  const hex = getCongestionColor(level).replace("#", "");
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function hasTrafficCongestionData(
  linkSegments: RouteLinkSegment[]
): boolean {
  return linkSegments.some((s) => s.congestionLevel > 0);
}
