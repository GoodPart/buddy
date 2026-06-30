import { getVWorldPublicApiKey, getVWorldPublicDomain } from "./config";
import type { VWorldNamespace } from "./global.d";

const VWORLD_BASE = "https://map.vworld.kr";

let loadPromise: Promise<VWorldNamespace> | null = null;

/**
 * webglMapInit.js.do가 기대하는 전역 변수만 설정.
 * ol3 설정은 vw.ol3WebGL.v30.js가 직접 구성한다.
 */
function setupVWorldGlobals() {
  const apiKey = getVWorldPublicApiKey();
  const domain = getVWorldPublicDomain();
  const w = window as unknown as Record<string, unknown>;
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";

  w.v_protocol = isHttps ? "https://" : "http://";
  w.vworldUrl = VWORLD_BASE;
  w.vworld2DCache = isHttps
    ? "https://2d.vworld.kr/2DCache"
    : "http://2d.vworld.kr:8895/2DCache";
  w.vworldBaseMapUrl = isHttps
    ? "https://cdn.vworld.kr/2d"
    : "http://cdn.vworld.kr:8080/2d";
  w.vworldStyledMapUrl = isHttps
    ? "https://2d.vworld.kr/stmap"
    : "http://2d.vworld.kr:8895/stmap";
  w.vworldApiKey = apiKey;
  w.vworldIsValid = "true";
  w.vworldErrMsg = "";
  w.isUserDomain = domain;
  w.vworld3DUrl = "/js/webglMapInit.js.do";
  // "y"면 vmap23.css 등 전역 CSS 주입 생략 (Next/Tailwind 레이아웃 보호)
  w.vworldNoCss = "y";
  w.vworldVectorKey = "483E0418-2F46-3223-80A1-F66D16A24685";
}

function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-vworld-src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.vworldSrc = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`VWorld SDK 로드 실패: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * vw.ol3WebGL.v30.js는 document.write로 jQuery 3.7 / OL 7.5.2 등을 주입한다.
 * SPA에서 동적 로드 시 document.write가 전체 DOM을 덮어쓰므로 appendScript로 대체한다.
 */
function installDocumentWriteShim(collectScript: (src: string) => void): () => void {
  const originalWrite = document.write.bind(document);

  document.write = (html: string) => {
    const match = html.match(/src\s*=\s*['"]([^'"]+)['"]/i);
    if (match?.[1]) {
      collectScript(match[1]);
    }
  };

  return () => {
    document.write = originalWrite;
  };
}

function waitFor(check: () => boolean, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("VWorld SDK 초기화 시간 초과"));
      }
    }, 50);
  });
}

/** webglMapInit.js.do와 동일: 3D 엔진 + vw.ol3WebGL (2D 의존성은 shim으로 연쇄 로드) */
async function load3DStack(): Promise<void> {
  const queuedScripts: string[] = [];
  const restoreWrite = installDocumentWriteShim((src) => {
    queuedScripts.push(src);
  });

  try {
    await appendScript(`${VWORLD_BASE}/js/ws3dmap/WS3DRelease3/WSViewerStartup.js`);
    await appendScript(
      `${VWORLD_BASE}/js/ws3dmap/WS3DRelease3/VWViewerStartup.v30.min.js?ver=2024061902`
    );
    await appendScript(
      `${VWORLD_BASE}/js/ws3dmap/WS3DRelease3/vw.ol3WebGL.v30.js?ver=2024061902`
    );
  } finally {
    restoreWrite();
  }

  for (const src of queuedScripts) {
    await appendScript(src);
  }
}

function isSdkReady(): boolean {
  return Boolean(window.vw?.CoordZ && window.vw?.Map);
}

export async function loadVWorldSdk(): Promise<VWorldNamespace> {
  if (typeof window === "undefined") {
    throw new Error("VWorld SDK는 브라우저에서만 로드할 수 있습니다.");
  }

  if (isSdkReady() && window.vw) return window.vw;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    setupVWorldGlobals();
    await load3DStack();
    await waitFor(isSdkReady);

    if (!window.vw) {
      throw new Error("VWorld SDK가 초기화되지 않았습니다.");
    }

    return window.vw;
  })();

  return loadPromise;
}

export function getVw(): VWorldNamespace {
  if (!isSdkReady() || !window.vw) {
    throw new Error("VWorld SDK가 아직 준비되지 않았습니다.");
  }
  return window.vw;
}
