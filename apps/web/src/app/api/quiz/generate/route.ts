import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { generateTopicQuiz } from "@/lib/ai"
import { checkAIRateLimit, incrementAIUsage, CREDIT_COST } from "@/lib/rate-limit"
import { z } from "zod"

const schema = z.object({ topicId: z.string() })

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

  const { topicId } = body.data
  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, level: true, isPremium: true, learningStyle: true, guidancePreference: true },
      })
    : sessionUser.email
    ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, level: true, isPremium: true, learningStyle: true, guidancePreference: true },
      })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = dbUser.id
  const learningStyle = dbUser.learningStyle ?? "READ_FIRST"
  const guidance = dbUser.guidancePreference ?? "GUIDED"

  // Fetch topic to resolve level
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { module: { include: { track: { select: { id: true } } } } },
  })
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 })

  const trackId = topic.module.track?.id
  const creditDecision = await getAICreditDecision({
    userId,
    action: "QUIZ",
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
        where: { userId_trackId: { userId, trackId } },
        select: { level: true },
      })
    : null
  const level = trackAssessment?.level ?? dbUser.level

  // Material must exist (user must have read the topic first)
  const material = await db.generatedMaterial.findUnique({
    where: { topicId_level_learningStyle_guidance: { topicId, level, learningStyle, guidance } },
  })
  if (!material) {
    return NextResponse.json({ error: "Baca materi terlebih dahulu sebelum mengerjakan kuis." }, { status: 400 })
  }

  // If already passed, return that info
  const passedQuiz = await db.topicQuiz.findFirst({
    where: { userId, topicId, passed: true },
    select: { id: true },
  })
  if (passedQuiz) {
    return NextResponse.json({ alreadyPassed: true })
  }

  // Return existing pending (unsubmitted) quiz — no AI call, no rate limit consumed
  const pendingQuiz = await db.topicQuiz.findFirst({
    where: { userId, topicId, passed: false, submittedAt: null },
    orderBy: { createdAt: "desc" },
  })
  if (pendingQuiz) {
    const clientQuestions = (pendingQuiz.questions as Array<{ question: string; options: string[] }>)
      .map(({ question, options }) => ({ question, options }))
    return NextResponse.json({ quizId: pendingQuiz.id, questions: clientQuestions, fromCache: true })
  }

  const rl = await checkAIRateLimit(userId, dbUser.isPremium)
  if (!rl.allowed) {
    const msg = rl.limitedBy === "weekly"
      ? "Kredit mingguan habis. Reset setiap Senin."
      : "Kredit harian habis. Coba lagi besok."
    return NextResponse.json({ error: msg, dailyRemaining: 0, weeklyRemaining: 0 }, { status: 429 })
  }

  if (creditDecision.shouldDebit) {
    try {
      await applyCreditTransaction({
        userId,
        type: "DEBIT",
        amount: creditDecision.debitAmount,
        action: "QUIZ",
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

  // Collect previous SUBMITTED questions for retry avoidance (last 3 attempts)
  const previousAttempts = await db.topicQuiz.findMany({
    where: { userId, topicId, submittedAt: { not: null } },
    select: { questions: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  })
  const previousQuestions = previousAttempts.flatMap((a) => {
    const qs = a.questions as Array<{ question: string }>
    return qs.map((q) => q.question)
  })

  const nextAttempt = previousAttempts.length + 1

  const questions = await generateTopicQuiz({
    materialContent: material.content,
    topicTitle: topic.title,
    previousQuestions,
  })

  const [quiz] = await Promise.all([
    db.topicQuiz.create({
      data: { userId, topicId, questions, attempt: nextAttempt, total: questions.length },
    }),
    incrementAIUsage(userId, CREDIT_COST.QUIZ),
  ])

  const clientQuestions = questions.map(({ question, options }) => ({ question, options }))

  return NextResponse.json({ quizId: quiz.id, questions: clientQuestions })
}
