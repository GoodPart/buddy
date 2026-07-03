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

export type TurnIconKind =
  | "straight"
  | "left"
  | "right"
  | "uturn"
  | "roundabout"
  | "arrive"
  | "fork"
  | "unknown";

export type NavPhase = "far" | "near" | "imminent" | "now" | "arrived";

export type NavGuidanceState = {
  upcoming: RouteGuidance | null;
  thenNext: RouteGuidance | null;
  distanceToUpcomingM: number;
  /** 경로 끝까지 잔여 거리(m) — 실제 도착 판정 기준 */
  remainingToDestinationM: number;
  phase: NavPhase;
  traveledM: number;
};

const PASSED_MANEUVER_M = 25;
/** pathDistance 기준 도착 임계 (m) */
const ARRIVAL_THRESHOLD_M = 30;

export function formatTurnType(turnType?: number): string {
  if (turnType == null) return "안내";
  return TURN_LABELS[turnType] ?? "안내";
}

export function getRoutePathDistanceM(route: RouteResponse): number {
  return route.pathDistance > 0 ? route.pathDistance : route.totalDistance;
}

export function getTurnIconKind(turnType?: number): TurnIconKind {
  switch (turnType) {
    case 12:
    case 16:
    case 17:
    case 104:
    case 117:
    case 118:
    case 123:
      return "left";
    case 13:
    case 18:
    case 19:
    case 105:
    case 119:
    case 124:
      return "right";
    case 14:
    case 126:
      return "uturn";
    case 110:
    case 111:
      return "roundabout";
    case 100:
    case 122:
    case 201:
      return "arrive";
    case 11:
    case 125:
    case 127:
    case 128:
    case 129:
      return "straight";
    case 103:
      return "fork";
    default:
      return "unknown";
  }
}

/** 네비 표시용 — 출발(200) 안내는 제외 */
function getNavManeuvers(guidances: RouteGuidance[]): RouteGuidance[] {
  return guidances.filter((g) => g.turnType !== 200);
}

/** 마지막 구간 — turnType 201 안내점은 path 끝보다 앞에 있을 수 있음 */
export function isFinalApproach(nav: Pick<
  NavGuidanceState,
  "upcoming" | "thenNext"
>): boolean {
  if (!nav.upcoming) return false;
  if (nav.upcoming.turnType === 201) return true;
  return nav.thenNext == null;
}

/** HUD·TTS 거리 — 마지막 구간은 목적지까지 잔여 거리 사용 */
export function getGuidanceDistanceM(
  nav: Pick<
    NavGuidanceState,
    "upcoming" | "thenNext" | "distanceToUpcomingM" | "remainingToDestinationM"
  >
): number {
  return isFinalApproach(nav)
    ? nav.remainingToDestinationM
    : nav.distanceToUpcomingM;
}

function resolvePhase(
  distanceToUpcomingM: number,
  arrived: boolean
): NavPhase {
  if (arrived) return "arrived";
  if (distanceToUpcomingM <= 30) return "now";
  if (distanceToUpcomingM <= 200) return "imminent";
  if (distanceToUpcomingM <= 500) return "near";
  return "far";
}

/** 경로상 주행 거리(m) 기준 — 다음 매뉴버 중심 */
export function resolveGuidanceAtDistance(
  route: RouteResponse,
  traveledM: number
): NavGuidanceState {
  const pathDist = getRoutePathDistanceM(route);
  const maneuvers = getNavManeuvers(route.guidances);

  if (!maneuvers.length) {
    return {
      upcoming: null,
      thenNext: null,
      distanceToUpcomingM: 0,
      remainingToDestinationM: 0,
      phase: "arrived",
      traveledM: 0,
    };
  }

  const clamped = Math.min(Math.max(0, traveledM), pathDist);
  const remainingToDestinationM = Math.max(0, pathDist - clamped);
  const arrived = remainingToDestinationM <= ARRIVAL_THRESHOLD_M;

  /** 아직 지나지 않은 첫 매뉴벼 — 신호 대기(교차로 15m 전)에서도 현재 회전 유지 */
  let upcomingIdx = maneuvers.findIndex(
    (g) => clamped <= g.distanceAlongRoute + PASSED_MANEUVER_M
  );
  if (upcomingIdx === -1) {
    upcomingIdx = maneuvers.length - 1;
  }

  const upcoming = maneuvers[upcomingIdx] ?? null;
  const thenNext = maneuvers[upcomingIdx + 1] ?? null;
  const distanceToUpcomingM = upcoming
    ? Math.max(0, upcoming.distanceAlongRoute - clamped)
    : 0;

  const navSlice = {
    upcoming,
    thenNext,
    distanceToUpcomingM,
    remainingToDestinationM,
  };

  return {
    upcoming,
    thenNext,
    distanceToUpcomingM,
    remainingToDestinationM,
    phase: resolvePhase(getGuidanceDistanceM(navSlice), arrived),
    traveledM: clamped,
  };
}

/** progress(0~1) → 거리 기반 네비 안내 */
export function resolveGuidanceAtProgress(
  route: RouteResponse,
  progress: number
): NavGuidanceState {
  const pathDist = getRoutePathDistanceM(route);
  const traveledM =
    Math.min(1, Math.max(0, progress)) * pathDist;
  return resolveGuidanceAtDistance(route, traveledM);
}

export type GuidanceListItemState = "passed" | "active" | "upcoming";

/** 전체 안내 리스트 항목 상태 — 지남 / 진행중 / 대기 */
export function getGuidanceListItemState(
  guidance: RouteGuidance,
  nav: NavGuidanceState,
  status: "idle" | "ready" | "running" | "paused" | "arrived"
): GuidanceListItemState {
  if (status === "arrived") return "passed";

  const { upcoming } = nav;
  if (!upcoming) return "upcoming";

  if (guidance.turnType === 200 && status !== "idle") return "passed";

  if (status === "idle" || status === "ready") {
    return guidance.index === upcoming.index ? "active" : "upcoming";
  }

  if (guidance.index === upcoming.index) return "active";

  if (
    guidance.distanceAlongRoute <
    upcoming.distanceAlongRoute - PASSED_MANEUVER_M
  ) {
    return "passed";
  }

  return "upcoming";
}

export function formatNavDistance(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  if (m >= 200) return `${Math.round(m / 50) * 50}m`;
  if (m >= 50) return `${Math.round(m / 10) * 10}m`;
  return `${m}m`;
}

export function buildNavInstruction(
  nav: NavGuidanceState
): { primary: string; secondary: string | null } {
  const { upcoming, phase } = nav;
  if (!upcoming) {
    return { primary: "안내 없음", secondary: null };
  }

  if (phase === "arrived") {
    return {
      primary: "목적지에 도착했습니다",
      secondary: upcoming.name ?? upcoming.description,
    };
  }

  const distM = getGuidanceDistanceM(nav);
  const road =
    upcoming.nextRoadName ?? upcoming.name ?? upcoming.description;
  const action = isFinalApproach(nav) ? "도착" : upcoming.turnLabel;

  if (phase === "now") {
    return {
      primary: `지금 ${action}`,
      secondary: road ? `${road} 방면` : null,
    };
  }

  return {
    primary: `${formatNavDistance(distM)} 후 ${action}`,
    secondary: road ? `${road} 진입` : upcoming.description,
  };
}
