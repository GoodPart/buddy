const TMAP_CORE_FILE = "tmapjs2.min.js?version=20231206";
const BOOTSTRAP_ID = "tmap-jsv2-bootstrap";
const CORE_ID = "tmap-jsv2-core";

let loadPromise: Promise<typeof Tmapv2> | null = null;

export function isTmapSdkReady(): boolean {
  const t = window.Tmapv2;
  return (
    !!t &&
    typeof t.LatLng === "function" &&
    typeof t.Map === "function"
  );
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      // layout(beforeInteractive) 등으로 이미 삽입된 스크립트 — load 이벤트 재발생 안 함
      resolve();
      return;
    }

    const el = document.createElement("script");
    el.id = id;
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset.loaded = "true";
      resolve();
    };
    el.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(el);
  });
}

function waitForTmapSdk(maxMs = 20000): Promise<typeof Tmapv2> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      if (isTmapSdkReady()) {
        resolve(window.Tmapv2!);
        return;
      }
      if (Date.now() - started >= maxMs) {
        reject(new Error("Tmap SDK 로드 시간 초과"));
        return;
      }
      window.setTimeout(check, 50);
    };

    check();
  });
}

async function ensureCoreSdk(): Promise<void> {
  if (isTmapSdkReady()) return;

  const base = window.Tmapv2?._getScriptLocation?.();
  if (!base) throw new Error("Tmap bootstrap 초기화 실패");

  await loadScript(`${base}${TMAP_CORE_FILE}`, CORE_ID);
  await waitForTmapSdk();
}

/** bootstrap(document.write) 후 본체 SDK를 동적으로 로드한다. */
export function loadTmapSdk(appKey: string): Promise<typeof Tmapv2> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Tmap SDK는 브라우저에서만 로드할 수 있습니다.")
    );
  }
  if (isTmapSdkReady()) return Promise.resolve(window.Tmapv2!);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const bootstrapUrl = `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${appKey}`;
    await loadScript(bootstrapUrl, BOOTSTRAP_ID);
    await ensureCoreSdk();

    const sdk = await waitForTmapSdk();
    sdk.setHttpsMode?.(true);
    return sdk;
  })().catch((e) => {
    loadPromise = null;
    throw e;
  });

  return loadPromise;
}
