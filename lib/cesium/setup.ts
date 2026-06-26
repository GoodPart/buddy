/** Cesium 정적 에셋(Workers 등) — public/cesium 복사본 기준 */
export function configureCesiumBaseUrl() {
  if (typeof window === "undefined") return;
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    "/cesium/";
}

export function getCesiumIonToken(): string | undefined {
  const token = process.env.NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN?.trim();
  return token || undefined;
}

/** Cesium Ion 토큰은 header.payload.signature 형태의 JWT 3부분이어야 함 */
export function isCesiumIonTokenValid(): boolean {
  const token = getCesiumIonToken();
  if (!token) return false;
  return token.split(".").length === 3;
}

export function getCesiumIonTokenIssue(): string | null {
  const token = getCesiumIonToken();
  if (!token) {
    return "NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN이 설정되지 않았습니다.";
  }
  if (!isCesiumIonTokenValid()) {
    return "Ion 토큰이 잘려 있습니다. Cesium Ion 대시보드에서 전체 토큰을 다시 복사하세요.";
  }
  return null;
}
