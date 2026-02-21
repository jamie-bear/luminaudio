import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/chunker";
import { concatenateWavBuffers } from "@/lib/wav";

const RESEMBLE_API_BASE = "https://f.cluster.resemble.ai/synthesize";

export interface TtsRequest {
  text: string;
  voiceUuid?: string;
  apiKey: string;
  sampleRate?: number;
  precision?: "PCM_16" | "PCM_32" | "MULAW";
  speakingRate?: number;
  exaggeration?: number;
  temperature?: number;
}

async function synthesizeChunk(
  text: string,
  apiKey: string,
  voiceUuid: string,
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
      sample_rate: sampleRate,
      precision,
      speaking_rate: speakingRate,
      exaggeration,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resemble.ai API error ${res.status}: ${body}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("audio")) {
    const raw = await res.text();
    let msg = "Resemble.ai returned a non-audio response (check your API key and voice UUID)";
    try {
      const json = JSON.parse(raw);
      msg = json.message ?? json.error ?? json.detail ?? raw;
    } catch {
      if (raw) msg = raw;
    }
    throw new Error(msg);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
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
    sampleRate = 44100,
    precision = "PCM_16",
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
        synthesizeChunk(chunk, apiKey, voiceUuid, sampleRate, precision, speakingRate, exaggeration, temperature)
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
