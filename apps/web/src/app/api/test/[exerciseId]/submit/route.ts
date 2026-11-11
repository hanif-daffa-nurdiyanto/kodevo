import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { evaluateTestCode, inferCodeLanguage } from "@/lib/ai"
import { checkAIRateLimit, incrementAIUsage, recordStreak, CREDIT_COST } from "@/lib/rate-limit"
import { z } from "zod"

const schema = z.object({
  code: z.string().min(1),
  language: z.string().default("html"),
})

const XP_PER_TOPIC = 100
const XP_FIRST_ATTEMPT_BONUS = 50

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json(
      { error: "Layanan AI sedang dalam maintenance. Silakan coba beberapa saat lagi." },
      { status: 503 }
    )
  }

  const { exerciseId } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, level: true, isPremium: true, xp: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, level: true, isPremium: true, xp: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, userId: dbUser.id },
    include: {
      topic: {
        include: { module: { include: { track: { select: { id: true, title: true, goal: true } } } } },
      },
    },
  })
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 })

  const expectedLanguage = inferCodeLanguage(
    exercise.topic.title,
    exercise.topic.description,
    exercise.topic.module.track?.title ?? "",
    exercise.topic.module.track?.goal ?? ""
  )

  if (exercise.passed) {
    return NextResponse.json({ error: "Soal ini sudah lulus" }, { status: 409 })
  }

  const creditDecision = await getAICreditDecision({
    userId: dbUser.id,
    action: "EXERCISE_SUBMIT",
    trackId: exercise.topic.module.track?.id,
    moduleIsFree: exercise.topic.module.isFree,
  })
  if (!creditDecision.canAccess) {
    const status = creditDecision.reason === "TRACK_NOT_FOUND" ? 404 : 403
    const error = creditDecision.reason === "BUNDLE_REQUIRED" ? "Bundle required" : "Forbidden"
    return NextResponse.json({ error, reason: creditDecision.reason }, { status })
  }

  const rl = await checkAIRateLimit(dbUser.id, dbUser.isPremium)
  if (!rl.allowed) {
    const msg = rl.limitedBy === "weekly"
      ? "Kredit mingguan habis. Reset setiap Senin."
      : "Kredit harian habis. Coba lagi besok."
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  const { code, language } = body.data

  if (creditDecision.shouldDebit) {
    try {
      await applyCreditTransaction({
        userId: dbUser.id,
        type: "DEBIT",
        amount: creditDecision.debitAmount,
        action: "EXERCISE_SUBMIT",
        refId: exerciseId,
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

  const result = await evaluateTestCode({
    topicTitle: exercise.topic.title,
    learningObjective: exercise.topic.learningObjective,
    level: dbUser.level,
    exercisePrompt: exercise.prompt,
    requirements: exercise.requirements as string[],
    code,
    language,
    expectedLanguage,
  })

  const ops: Promise<any>[] = [
    db.testSubmission.create({
      data: {
        userId: dbUser.id,
        exerciseId,
        code,
        language,
        score: result.totalScore,
        funcScore: result.funcScore,
        qualityScore: result.qualityScore,
        efficiencyScore: result.efficiencyScore,
        feedback: result.feedback,
        passed: result.passed,
      },
    }),
    incrementAIUsage(dbUser.id, CREDIT_COST.EXERCISE),
    recordStreak(dbUser.id),
  ]

  if (result.passed) {
    ops.push(
      db.exercise.update({ where: { id: exerciseId }, data: { passed: true } })
    )

    const xpGain = XP_PER_TOPIC + (exercise.attemptNumber === 1 ? XP_FIRST_ATTEMPT_BONUS : 0)
    ops.push(
      db.user.update({ where: { id: dbUser.id }, data: { xp: { increment: xpGain } } })
    )
  }

  const [submission] = await Promise.all(ops)

  // Mark module as COMPLETED if all topics passed
  if (result.passed) {
    const moduleTopicIds = (
      await db.topic.findMany({
        where: { moduleId: exercise.topic.moduleId },
        select: { id: true },
      })
    ).map((t) => t.id)

    const passedCount = await db.exercise.count({
      where: { userId: dbUser.id, topicId: { in: moduleTopicIds }, passed: true },
    })

    if (passedCount >= moduleTopicIds.length) {
      await db.enrollment.updateMany({
        where: { userId: dbUser.id, moduleId: exercise.topic.moduleId },
        data: { status: "COMPLETED", completedAt: new Date() },
      })
    }
  }

  const xpGained = result.passed
    ? XP_PER_TOPIC + (exercise.attemptNumber === 1 ? XP_FIRST_ATTEMPT_BONUS : 0)
    : 0

  return NextResponse.json({ submission, result, xpGained })
}
