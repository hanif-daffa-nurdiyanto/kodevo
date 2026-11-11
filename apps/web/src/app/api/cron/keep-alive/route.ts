import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Lightweight query to keep Supabase from suspending due to inactivity.
  // Supabase free tier pauses after 7 days with no database activity.
  const count = await db.user.count()

  return NextResponse.json({ ok: true, users: count, ts: new Date().toISOString() })
}
