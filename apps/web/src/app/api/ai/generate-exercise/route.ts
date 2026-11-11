import { NextRequest, NextResponse } from "next/server"

// Deprecated — use /api/test/generate instead
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Use /api/test/generate" }, { status: 301 })
}
