import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { generateExercise, inferCodeLanguage } from "@/lib/ai"
import { sanitizeExerciseStarterCode } from "@/lib/exercise-utils"
import { checkAIRateLimit, incrementAIUsage, CREDIT_COST } from "@/lib/rate-limit"
import { z } from "zod"

const schema = z.object({ topicId: z.string(), force: z.boolean().optional() })
type SessionUser = { id?: string | null; email?: string | null }

export async function POST(req: NextRequest) {
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json(
      { error: "Layanan AI sedang dalam maintenance. Silakan coba beberapa saat lagi." },
      { status: 503 }
    )
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { topicId, force } = body.data
  const sessionUser = session.user as SessionUser
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, level: true, isPremium: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, level: true, isPremium: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { module: { include: { track: true } } },
  })
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 })

  // Resolve level: track assessment > user global level
  const trackId = topic.module.track?.id
  const creditDecision = await getAICreditDecision({
    userId: dbUser.id,
    action: "EXERCISE_GENERATE",
    trackId,
    moduleIsFree: topic.module.isFree,
  })
  if (!creditDecision.canAccess) {
    const status = creditDecision.reason === "TRACK_NOT_FOUND" ? 404 : 403
    const error = creditDecision.reason === "BUNDLE_REQUIRED" ? "Bundle required" : "Forbidden"
    return NextResponse.json({ error, reason: creditDecision.reason }, { status })
  }

  const trackAssessment = trackId
    ? await db.trackAssessment.findUnique({
        where: { userId_trackId: { userId: dbUser.id, trackId } },
        select: { level: true },
      })
    : null
  const resolvedLevel = trackAssessment?.level ?? dbUser.level

  const previousExercises = await db.exercise.findMany({
    where: { userId: dbUser.id, topicId },
    select: { id: true, prompt: true, passed: true, attemptNumber: true },
    orderBy: { createdAt: "asc" },
  })

  const suggestedLanguage = inferCodeLanguage(
    topic.title,
    topic.description,
    topic.module.track?.title ?? "",
    topic.module.track?.goal ?? ""
  )

  // Return existing unsubmitted exercise without consuming rate limit (unless force=true)
  if (!force) {
    const latest = previousExercises.at(-1)
    if (latest && !latest.passed) {
      const hasSubmission = await db.testSubmission.findFirst({ where: { exerciseId: latest.id } })
      if (!hasSubmission) {
        const exercise = await db.exercise.findUnique({ where: { id: latest.id } })
        if (exercise) {
          // Sanitize on read — old exercises may have been generated before sandbox constraints
          const sanitized = sanitizeExerciseStarterCode(suggestedLanguage, exercise.starterCode as Record<string, string> | null)
          return NextResponse.json({ exercise: { ...exercise, starterCode: sanitized }, suggestedLanguage })
        }
      }
    }
  }

  const rl = await checkAIRateLimit(dbUser.id, dbUser.isPremium)
  if (!rl.allowed) {
    const msg = rl.limitedBy === "weekly"
      ? "Kredit mingguan habis. Reset setiap Senin."
      : "Kredit harian habis. Coba lagi besok."
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  if (creditDecision.shouldDebit) {
    try {
      await applyCreditTransaction({
        userId: dbUser.id,
        type: "DEBIT",
        amount: creditDecision.debitAmount,
        action: "EXERCISE_GENERATE",
        refId: topicId,
      })
    } catch (error) {
      if (error instanceof InsufficientCreditError) {
        return NextResponse.json(
          { error: "Credit tidak cukup, top up dulu.", balance: error.balance, required: error.required },
          { status: 402 }
        )
      }
      throw error
    }
  }

  const previousPrompts = previousExercises.map((e) => e.prompt)
  const nextAttempt = previousExercises.length + 1
  const userSeed = `${dbUser.id}-${topicId}-attempt${nextAttempt}`

  const { prompt, requirements, starterCode } = await generateExercise({
    topicTitle: topic.title,
    learningObjective: topic.learningObjective,
    level: resolvedLevel,
    language: suggestedLanguage,
    userSeed,
    previousPrompts,
  })

  const [exercise] = await Promise.all([
    db.exercise.create({
      data: { userId: dbUser.id, topicId, prompt, requirements, starterCode, level: resolvedLevel, attemptNumber: nextAttempt },
    }),
    incrementAIUsage(dbUser.id, CREDIT_COST.EXERCISE),
  ])

  return NextResponse.json({ exercise, suggestedLanguage })
}
