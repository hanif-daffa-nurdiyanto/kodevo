import { NextRequest, NextResponse } from "next/server"

// GitHub webhook — reserved for advanced track submission (not yet implemented)
export async function POST(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "GitHub submission not yet enabled" })
}
