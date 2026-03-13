import { NextRequest, NextResponse } from "next/server";

// Long-running synthesis can take several minutes for large texts on CPU
export const maxDuration = 600;

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
  sampleRate?: number;
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
    sampleRate   = 24000,
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
        sample_rate: Number(sampleRate),
        output_format: "wav",
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
