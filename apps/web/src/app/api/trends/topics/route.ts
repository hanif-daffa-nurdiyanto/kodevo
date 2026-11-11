import { NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { extractTrendingTopics, TOPIC_MAP } from "@/lib/topic-trends"

const FALLBACK = TOPIC_MAP.slice(0, 8).map((t) => ({
  label: t.label, icon: t.icon, goal: t.goal, count: 0,
}))

export async function GET() {
  const tracks = await db.track.findMany({ select: { goal: true }, where: { goal: { not: null } } })
  const goals = tracks.map((t) => t.goal!).filter(Boolean)

  const trending = extractTrendingTopics(goals)
  return NextResponse.json(trending.length >= 4 ? trending : FALLBACK)
}
