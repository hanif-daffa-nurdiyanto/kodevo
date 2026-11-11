import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const topicId = req.nextUrl.searchParams.get("topicId")
  const trackSlug = req.nextUrl.searchParams.get("trackSlug")
  if (!topicId || !trackSlug) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: {
      module: {
        include: {
          track: true,
          topics: { orderBy: { order: "asc" }, select: { id: true, order: true } },
        },
      },
    },
  })
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 })

  const { module: mod } = topic
  if (mod.track.type === TrackType.BUNDLE && !mod.track.publishedAt) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 })
  }

  // Next topic in same module
  const nextTopic = mod.topics.find((t) => t.order > topic.order)
  if (nextTopic) {
    return NextResponse.json({
      type: "topic",
      href: `/learn/${trackSlug}/${mod.id}/${nextTopic.id}`,
    })
  }

  // Next module in track
  const nextModule = await db.module.findFirst({
    where: { trackId: mod.trackId, order: { gt: mod.order } },
    orderBy: { order: "asc" },
  })
  if (nextModule) {
    return NextResponse.json({
      type: "module",
      href: `/learn/${trackSlug}/${nextModule.id}`,
    })
  }

  // Track complete
  return NextResponse.json({
    type: "complete",
    href: `/learn/${trackSlug}/complete`,
  })
}
