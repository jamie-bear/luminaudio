import { NextResponse } from "next/server";

const BACKEND_URL = process.env.CHATTERBOX_BACKEND_URL ?? "http://chatterbox:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (!res.ok) {
      return NextResponse.json({ status: "offline", model_loaded: false }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "offline", model_loaded: false }, { status: 200 });
  }
}
