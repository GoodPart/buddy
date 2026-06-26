const BASE = "https://apis.openapi.sk.com";

function getApiKey() {
    const key = process.env.TMAP_APP_KEY;
    if (!key) throw new Error("TMAP_APP_KEY is not set");
    return key;
}

export async function tmapFetch<T>(path: string, init?: RequestInit & { searchParams?: Record<string, string> }) {
    const url = new URL(path, BASE);

    if (init?.searchParams) {
        Object.entries(init.searchParams).forEach(([k, v]) => {
          url.searchParams.set(k, v);
        });
      }

    const  res = await fetch(url.toString(), {
        ...init,
        headers: {
            "appKey": getApiKey(),
            "Content-Type": "application/json",
            ...init?.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Tmap API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}