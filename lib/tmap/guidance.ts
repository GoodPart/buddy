import type { RouteGuidance, RouteResponse } from "./types";

/** Tmap turnType → 한글 (주요 코드만, 미등록은 "안내") */
const TURN_LABELS: Record<number, string> = {
  11: "직진",
  12: "좌회전",
  13: "우회전",
  14: "유턴",
  16: "8시 방향 좌회전",
  17: "10시 방향 좌회전",
  18: "2시 방향 우회전",
  19: "4시 방향 우회전",
  100: "목적지",
  101: "휴게소",
  102: "고속도로",
  103: "일반도로",
  104: "좌측 도로",
  105: "우측 도로",
  106: "지하차도",
  107: "고가차로",
  108: "터널",
  109: "교차로",
  110: "로터리",
  111: "회전교차로",
  117: "8시 방향",
  118: "10시 방향",
  119: "12시 방향",
  120: "고가도로",
  121: "터널",
  122: "목적지 방면",
  123: "왼쪽",
  124: "오른쪽",
  125: "직진",
  126: "유턴",
  127: "직진",
  128: "직진",
  129: "직진",
  200: "출발",
  201: "도착",
};

export function formatTurnType(turnType?: number): string {
  if (turnType == null) return "안내";
  return TURN_LABELS[turnType] ?? "안내";
}

/** progress(0~1) 기준 현재·다음 안내 반환 */
export function resolveGuidanceAtProgress(
  route: RouteResponse,
  progress: number
): { current: RouteGuidance | null; next: RouteGuidance | null } {
  const { guidances } = route;
  if (!guidances.length) return { current: null, next: null };

  const targetDist =
    Math.min(1, Math.max(0, progress)) *
    (route.pathDistance > 0 ? route.pathDistance : route.totalDistance);
  let current: RouteGuidance | null = guidances[0];
  let next: RouteGuidance | null = guidances[1] ?? null;

  for (let i = 0; i < guidances.length; i++) {
    if (guidances[i].distanceAlongRoute <= targetDist) {
      current = guidances[i];
      next = guidances[i + 1] ?? null;
    } else {
      break;
    }
  }

  return { current, next };
}
