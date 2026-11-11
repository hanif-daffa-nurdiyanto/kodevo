import { NextRequest, NextResponse } from "next/server"
import { db, TrackType } from "@kodevo/db"

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

  const track = await db.track.findUnique({ where: { slug }, select: { id: true, type: true, publishedAt: true } })
  if (!track || (track.type === TrackType.BUNDLE && !track.publishedAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (track.type === TrackType.BUNDLE) {
    return NextResponse.json({ error: "Screening disabled for bundles" }, { status: 403 })
  }

  return NextResponse.json({ id: track.id })
}
