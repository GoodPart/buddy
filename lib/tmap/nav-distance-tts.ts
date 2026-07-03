/** TTS용 거리 한글 읽기 — 900m → 구백미터, 1.5km → 일점오킬로미터 */

import {
  buildNavInstruction,
  getGuidanceDistanceM,
  isFinalApproach,
  type NavGuidanceState,
} from "@/lib/tmap/guidance";

const DIGIT = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"] as const;

function intToKoreanSino(n: number): string {
  if (n === 0) return "영";

  const parts: string[] = [];
  const cheon = Math.floor(n / 1000);
  const rem1 = n % 1000;
  const baek = Math.floor(rem1 / 100);
  const rem2 = rem1 % 100;
  const sip = Math.floor(rem2 / 10);
  const il = rem2 % 10;

  if (cheon > 0) {
    parts.push(`${cheon === 1 ? "" : DIGIT[cheon]}천`);
  }
  if (baek > 0) {
    parts.push(`${baek === 1 ? "" : DIGIT[baek]}백`);
  }
  if (sip > 0) {
    parts.push(`${sip === 1 ? "" : DIGIT[sip]}십`);
  }
  if (il > 0) {
    parts.push(DIGIT[il]);
  }

  return parts.join("");
}

function formatKmForTts(km: number): string {
  const fixed = km.toFixed(1);
  const [intPart, decPart] = fixed.split(".");
  const intSpoken = intToKoreanSino(parseInt(intPart, 10));
  if (decPart === "0") return `${intSpoken}킬로미터`;
  return `${intSpoken}점${DIGIT[parseInt(decPart, 10)]}킬로미터`;
}

/** 화면 `formatNavDistance`와 동일 반올림, TTS 한글 읽기 */
export function formatNavDistanceForTts(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m >= 1000) return formatKmForTts(m / 1000);
  if (m >= 200) return `${intToKoreanSino(Math.round(m / 50) * 50)}미터`;
  if (m >= 50) return `${intToKoreanSino(Math.round(m / 10) * 10)}미터`;
  return `${intToKoreanSino(m)}미터`;
}

/** HUD 안내 문장 — TTS 자연스러운 한국어 읽기 */
export function buildNavInstructionForTts(
  nav: NavGuidanceState
): { primary: string; secondary: string | null } {
  const { upcoming, phase } = nav;
  if (!upcoming) {
    return { primary: "안내가 없습니다", secondary: null };
  }

  if (phase === "arrived") {
    const place = upcoming.name ?? upcoming.description;
    return {
      primary: "목적지에 도착했습니다",
      secondary: place ? `${place}입니다` : null,
    };
  }

  const distM = getGuidanceDistanceM(nav);
  const road =
    upcoming.nextRoadName ?? upcoming.name ?? upcoming.description;
  const action = isFinalApproach(nav) ? "도착" : upcoming.turnLabel;

  if (distM <= 50) {
    return {
      primary: `잠시후 ${action}입니다`,
      secondary: road ? `${road} 방면입니다` : null,
    };
  }

  return {
    primary: `${formatNavDistanceForTts(distM)} 후 ${action}입니다`,
    secondary: road ? `${road}로 진입합니다` : null,
  };
}

/** 지하·터널 배지 — TTS 자연스러운 문장 */
export function formatSurfaceBadgeForTts(badge: string): string {
  const text = convertDistanceTokensForTts(badge);
  if (text.startsWith("지하 운행중")) {
    const dist = text.match(/탈출 (.+)$/)?.[1];
    return dist ? `${dist} 앞에서 터널을 빠져나갑니다` : "지하 도로를 운행 중입니다";
  }
  if (text.includes("진입")) {
    const dist = text.match(/진입 · (.+)$/)?.[1];
    const kind = text.includes("터널") ? "터널" : "지하차도";
    if (dist) return `${dist} 앞 ${kind}에 진입합니다`;
    return `${kind}에 진입합니다`;
  }
  if (text.includes("탈출")) {
    return text.includes("터널") ? "터널을 빠져나갑니다" : "지하차도를 빠져나갑니다";
  }
  if (text.includes("운행중")) return "지하 도로를 운행 중입니다";
  return text.endsWith("입니다") ? text : `${text}입니다`;
}

/** 화면용 문장 내 거리 토큰(900m, 1.5km)을 TTS 읽기로 변환 */
export function convertDistanceTokensForTts(text: string): string {
  return text
    .replace(/(\d+(?:\.\d+)?)\s*km/gi, (_, km) =>
      formatKmForTts(parseFloat(km))
    )
    .replace(/(\d+)\s*m\b/gi, (_, m) =>
      formatNavDistanceForTts(parseInt(m, 10))
    );
}

/** buildNavInstruction 결과를 TTS용으로 변환 (보조 경로) */
export function navInstructionToTts(nav: NavGuidanceState): {
  primary: string;
  secondary: string | null;
} {
  const { primary, secondary } = buildNavInstruction(nav);
  return {
    primary: convertDistanceTokensForTts(primary),
    secondary: secondary ? convertDistanceTokensForTts(secondary) : null,
  };
}
