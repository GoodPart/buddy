import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TtsBody = {
  text?: string;
  speed?: number;
};

export async function POST(req: Request) {
  let body: TtsBody;
  try {
    body = (await req.json()) as TtsBody;
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text가 필요합니다." }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "text가 너무 깁니다." }, { status: 400 });
  }

  const base = process.env.TTS_SERVER_URL ?? "http://127.0.0.1:8765";
  const speed = typeof body.speed === "number" ? body.speed : 1.2;

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speed }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "TTS 서버에 연결할 수 없습니다. 다른 터미널에서 npm run tts:dev 를 실행하세요.",
      },
      { status: 503 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: detail || "TTS 합성에 실패했습니다." },
      { status: upstream.status }
    );
  }

  const audio = await upstream.arrayBuffer();
  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
