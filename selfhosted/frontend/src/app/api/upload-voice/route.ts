import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.CHATTERBOX_BACKEND_URL ?? "http://chatterbox:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const res = await fetch(`${BACKEND_URL}/api/upload-voice`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
