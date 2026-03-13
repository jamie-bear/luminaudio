import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.CHATTERBOX_BACKEND_URL ?? "http://chatterbox:8000";

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const voiceId = searchParams.get("id");

  if (!voiceId) {
    return NextResponse.json({ error: "Missing voice id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/voices/${encodeURIComponent(voiceId)}`,
      { method: "DELETE" },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
