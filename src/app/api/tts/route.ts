import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/chunker";
import { concatenateWavBuffers } from "@/lib/wav";

const RESEMBLE_API_BASE = "https://f.cluster.resemble.ai/synthesize";

export interface TtsRequest {
  text: string;
  voiceUuid?: string;
  apiKey: string;
  model?: string;
  sampleRate?: number;
  precision?: "PCM_16" | "PCM_24" | "PCM_32" | "MULAW";
  useHd?: boolean;
}

interface SynthesizeResponse {
  success: boolean;
  audio_content?: string;
  message?: string;
  error?: string;
  error_name?: string;
  detail?: string;
  issues?: string[];
}

const TURBO_UNAVAILABLE = "DBCacheError";
const FALLBACK_MODEL = "chatterbox";

async function callSynthesizeApi(
  text: string,
  apiKey: string,
  voiceUuid: string,
  model: string,
  sampleRate: number,
  precision: string,
  useHd: boolean
): Promise<{ json: SynthesizeResponse; ok: boolean; status: number; rawBody?: string }> {
  const res = await fetch(RESEMBLE_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      voice_uuid: voiceUuid,
      data: text,
      model,
      sample_rate: sampleRate,
      precision,
      output_format: "wav",
      use_hd: useHd,
    }),
  });

  if (!res.ok) {
    const rawBody = await res.text();
    return { json: {} as SynthesizeResponse, ok: false, status: res.status, rawBody };
  }

  const json: SynthesizeResponse = await res.json();
  return { json, ok: true, status: res.status };
}

async function synthesizeChunk(
  text: string,
  apiKey: string,
  voiceUuid: string,
  model: string,
  sampleRate: number,
  precision: string,
  useHd: boolean
): Promise<Buffer> {
  let result = await callSynthesizeApi(
    text, apiKey, voiceUuid, model, sampleRate, precision, useHd
  );

  // If turbo is unavailable for this voice, fall back to chatterbox
  if (!result.ok && result.status === 400 && model !== FALLBACK_MODEL) {
    let parsed: SynthesizeResponse | null = null;
    try { parsed = JSON.parse(result.rawBody ?? ""); } catch { /* ignore */ }
    if (parsed?.error_name === TURBO_UNAVAILABLE) {
      console.warn(`Voice ${voiceUuid} unsupported by ${model}, retrying with ${FALLBACK_MODEL}`);
      result = await callSynthesizeApi(
        text, apiKey, voiceUuid, FALLBACK_MODEL, sampleRate, precision, useHd
      );
    }
  }

  if (!result.ok) {
    throw new Error(`Resemble.ai API error ${result.status}: ${result.rawBody}`);
  }

  // The /synthesize endpoint returns JSON with base64-encoded audio in audio_content
  const json = result.json;

  if (!json.success) {
    throw new Error(
      json.message ?? json.error ?? json.detail ?? "Synthesis failed (success=false)"
    );
  }

  if (json.issues && json.issues.length > 0) {
    console.warn("Resemble.ai synthesis issues:", json.issues);
  }

  if (!json.audio_content) {
    throw new Error(
      "Resemble.ai response missing audio_content. " +
      "Check that your API key and voice UUID are correct."
    );
  }

  return Buffer.from(json.audio_content, "base64");
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
    apiKey,
    voiceUuid = "default",
    model = "chatterbox-turbo",
    sampleRate = 48000,
    precision = "PCM_32",
    useHd = false,
  } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'text' field" },
      { status: 400 }
    );
  }
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'apiKey' field" },
      { status: 400 }
    );
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Text is empty after trimming" }, { status: 400 });
  }

  try {
    const wavBuffers = await Promise.all(
      chunks.map((chunk) =>
        synthesizeChunk(chunk, apiKey, voiceUuid, model, sampleRate, precision, useHd)
      )
    );

    const combined = concatenateWavBuffers(wavBuffers);

    return new NextResponse(new Uint8Array(combined), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(combined.length),
        "Content-Disposition": "inline; filename=\"output.wav\"",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
