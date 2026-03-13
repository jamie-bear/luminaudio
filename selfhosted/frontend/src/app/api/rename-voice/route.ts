import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.CHATTERBOX_BACKEND_URL ?? "http://chatterbox:8000";

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const voiceId = searchParams.get("id");

  if (!voiceId) {
    return NextResponse.json({ error: "Missing voice id" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const res = await fetch(
      `${BACKEND_URL}/api/voices/${encodeURIComponent(voiceId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Rename failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
