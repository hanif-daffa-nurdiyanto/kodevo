import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"
import { generateTrackScreeningQuestions } from "@/lib/ai"
import { getContextualTrackScreeningQuestions } from "@/lib/track-screening-questions"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

  const track = await db.track.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      goal: true,
      type: true,
      publishedAt: true,
      modules: {
        orderBy: { order: "asc" },
        take: 12,
        select: {
          title: true,
          description: true,
          topics: {
            orderBy: { order: "asc" },
            take: 5,
            select: { title: true },
          },
        },
      },
    },
  })

  if (!track || (track.type === TrackType.BUNDLE && !track.publishedAt)) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 })
  }
  if (track.type === TrackType.BUNDLE) {
    return NextResponse.json({ disabled: true, redirectTo: `/learn/${track.slug}` })
  }

  try {
    console.info("[track-screening/questions] generating", {
      trackId: track.id,
      title: track.title,
      moduleCount: track.modules.length,
    })
    const questions = await generateTrackScreeningQuestions({
      title: track.title,
      description: track.description,
      goal: track.goal,
      modules: track.modules,
    })

    return NextResponse.json({
      trackName: track.title,
      source: "generated",
      questions,
    })
  } catch (error) {
    console.warn("[track-screening/questions] fallback", {
      trackId: track.id,
      title: track.title,
      error: error instanceof Error ? error.message : String(error),
    })
    const fallback = getContextualTrackScreeningQuestions({
      trackName: track.title,
      trackDescription: track.description,
      modules: track.modules,
    })
    return NextResponse.json({
      trackName: fallback.trackName,
      source: "contextual_fallback",
      questions: fallback.questions,
    })
  }
}
