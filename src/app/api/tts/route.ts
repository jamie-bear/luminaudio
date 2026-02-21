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
  speakingRate?: number;
  exaggeration?: number;
  temperature?: number;
}

interface SynthesizeResponse {
  success: boolean;
  audio_content?: string;
  message?: string;
  error?: string;
  detail?: string;
  issues?: string[];
}

async function synthesizeChunk(
  text: string,
  apiKey: string,
  voiceUuid: string,
  model: string,
  sampleRate: number,
  precision: string,
  speakingRate: number,
  exaggeration: number,
  temperature: number
): Promise<Buffer> {
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
      speaking_rate: speakingRate,
      exaggeration,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resemble.ai API error ${res.status}: ${body}`);
  }

  // The /synthesize endpoint returns JSON with base64-encoded audio in audio_content
  const json: SynthesizeResponse = await res.json();

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
    speakingRate = 1.0,
    exaggeration = 0.65,
    temperature = 1.3,
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
        synthesizeChunk(chunk, apiKey, voiceUuid, model, sampleRate, precision, speakingRate, exaggeration, temperature)
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
