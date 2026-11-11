import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"
import { evaluateScreening } from "@/lib/ai"
import { z } from "zod"
import type { ScreeningAnswer } from "@/types"

const answerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string().optional(),
  type: z.enum(["mcq", "analysis"]),
})

const schema = z.object({
  trackId: z.string(),
  answers: z.array(answerSchema),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { trackId, answers } = body.data
  const track = await db.track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
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

  // Already assessed this track — return existing
  const existing = await db.trackAssessment.findUnique({
    where: { userId_trackId: { userId: dbUser.id, trackId } },
  })
  if (existing) {
    return NextResponse.json({ level: existing.level, score: 0, explanation: "", alreadyDone: true })
  }

  console.info("[track-screening/evaluate] evaluating", {
    trackId,
    title: track.title,
    moduleCount: track.modules.length,
    answerCount: answers.length,
  })

  const result = await evaluateScreening({
    answers: answers as ScreeningAnswer[],
    track: {
      title: track.title,
      description: track.description,
      goal: track.goal,
      modules: track.modules,
    },
  })

  await db.trackAssessment.create({
    data: { userId: dbUser.id, trackId, level: result.level },
  })

  return NextResponse.json({
    level: result.level,
    score: result.score,
    explanation: result.explanation,
  })
}
