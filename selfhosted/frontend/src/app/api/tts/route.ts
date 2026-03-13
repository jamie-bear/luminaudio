import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.CHATTERBOX_BACKEND_URL ?? "http://chatterbox:8000";

const MAX_TEXT_LENGTH = 50_000;

export interface TtsRequest {
  text: string;
  voiceId?: string;
  model?: string; // "original" | "turbo"
  temperature?: number;
  exaggeration?: number;
  cfgWeight?: number;
  speedFactor?: number;
}

export async function POST(req: NextRequest) {
  let body: TtsRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    text,
    voiceId,
    model        = "original",
    temperature  = 0.8,
    exaggeration = 0.5,
    cfgWeight    = 0.5,
    speedFactor  = 1.0,
  } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'text' field" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH.toLocaleString()} characters` },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice_id: voiceId || null,
        model: model === "turbo" ? "turbo" : "original",
        temperature: Number(temperature),
        exaggeration: Number(exaggeration),
        cfg_weight: Number(cfgWeight),
        speed_factor: Number(speedFactor),
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = errJson.detail ?? errJson.error ?? res.statusText;
      return NextResponse.json({ error: String(detail).slice(0, 300) }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audioBuffer.byteLength),
        "Content-Disposition": 'inline; filename="output.wav"',
      },
    });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "Unknown error";
    // Node.js/undici wraps all network-level failures as "fetch failed".
    // Provide a more actionable message so the UI can surface it clearly.
    const message =
      raw === "fetch failed"
        ? "The synthesis backend is unavailable or crashed. " +
          "On CPU this is usually caused by the process running out of memory " +
          "while processing long text — try splitting the text into shorter segments."
        : raw;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
