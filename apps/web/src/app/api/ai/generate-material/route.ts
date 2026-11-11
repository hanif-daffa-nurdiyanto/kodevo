import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { streamLearningMaterial, classifyTopicConfidence, fetchTopicContext } from "@/lib/ai"
import { checkAIRateLimit, incrementAIUsage, recordStreak, CREDIT_COST } from "@/lib/rate-limit"
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

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { module: { include: { track: true } } },
  })
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 })

  const creditDecision = await getAICreditDecision({
    userId,
    action: "MATERIAL",
    trackId: topic.module.track.id,
    moduleIsFree: topic.module.isFree,
  })
  if (!creditDecision.canAccess) {
    const status = creditDecision.reason === "TRACK_NOT_FOUND" ? 404 : 403
    const error = creditDecision.reason === "BUNDLE_REQUIRED" ? "Bundle required" : "Forbidden"
    return NextResponse.json({ error, reason: creditDecision.reason }, { status })
  }

  const trackId = topic.module.track?.id
  const trackAssessment = trackId
    ? await db.trackAssessment.findUnique({
        where: { userId_trackId: { userId, trackId } },
        select: { level: true },
      })
    : null
  const level = trackAssessment?.level ?? dbUser.level

  // Cache hit → return JSON instantly (no streaming needed)
  const existing = force ? null : await db.generatedMaterial.findUnique({
    where: { topicId_level_learningStyle_guidance: { topicId, level, learningStyle, guidance } },
  })
  if (existing) {
    db.generatedMaterial.update({
      where: { id: existing.id },
      data: { hitCount: { increment: 1 } },
    }).catch(() => {})
    await recordStreak(userId)
    const passedQuiz = await db.topicQuiz.findFirst({
      where: { userId, topicId, passed: true },
      select: { id: true },
    })
    return NextResponse.json({
      content: existing.content,
      quizPassed: !!passedQuiz,
      fromCache: true,
      canAccessExercise: creditDecision.canAccess,
    })
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
        action: "MATERIAL",
        refId: topicId,
      })
    } catch (error) {
      if (error instanceof InsufficientCreditError) {
        return NextResponse.json(
          {
            error: "Credit tidak cukup, top up dulu.",
            balance: error.balance,
            required: error.required,
          },
          { status: 402 }
        )
      }
      throw error
    }
  }

  // SERP pre-processing (before streaming starts)
  const FORCE_SERP_KEYWORDS = [
    "claude code", "claude ai", "cursor", "windsurf", "copilot",
    "gemini cli", "vibe coding", "ai coding", "lovable", "bolt.new",
    "v0.dev", "devin", "replit agent", "github copilot", "codeium",
    "supermaven", "continue.dev", "aider", "sweep ai",
  ]
  const titleLower = topic.title.toLowerCase()
  const forceSerp  = FORCE_SERP_KEYWORDS.some((kw) => titleLower.includes(kw))
  const confident  = forceSerp ? false : await classifyTopicConfidence(topic.title, topic.learningObjective ?? "")

  let webContext: string | null = null
  let usedSerp = false
  if (!confident) {
    webContext = await fetchTopicContext(topic.title)
    usedSerp = true
  }

  const serpFailed  = usedSerp && webContext === null
  const shouldCache = confident || (usedSerp && webContext !== null)
  const serpWarning = serpFailed
    ? "> ⚠️ **Catatan:** Topik ini berkembang pesat. Informasi di bawah mungkin belum mencakup update terbaru — cek dokumentasi resmi untuk verifikasi.\n\n"
    : ""

  await Promise.all([incrementAIUsage(userId, CREDIT_COST.MATERIAL), recordStreak(userId)])

  const llmStream = streamLearningMaterial({
    topicTitle: topic.title,
    learningObjective: topic.learningObjective,
    level,
    learningStyle: dbUser.learningStyle,
    guidancePreference: dbUser.guidancePreference,
    webContext,
  })

  const encoder = new TextEncoder()
  let accumulated = ""

  const readable = new ReadableStream({
    async start(controller) {
      // Prepend SERP warning if needed
      if (serpWarning) {
        controller.enqueue(encoder.encode(serpWarning))
        accumulated += serpWarning
      }
      try {
        for await (const text of llmStream) {
          accumulated += text
          controller.enqueue(encoder.encode(text))
        }
        // Save to cache after stream completes
        if (shouldCache && accumulated.trim()) {
          db.generatedMaterial.upsert({
            where: { topicId_level_learningStyle_guidance: { topicId, level, learningStyle, guidance } },
            create: { topicId, level, learningStyle, guidance, content: accumulated, generatedBy: userId },
            update: { content: accumulated, generatedBy: userId, hitCount: 0 },
          }).catch(() => {})
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Daily-Remaining": String(Math.max(0, rl.dailyRemaining - CREDIT_COST.MATERIAL)),
      "X-Weekly-Remaining": String(Math.max(0, rl.weeklyRemaining - CREDIT_COST.MATERIAL)),
      "X-Can-Access-Exercise": String(creditDecision.canAccess),
      "X-Credit-Debited": String(creditDecision.debitAmount),
    },
  })
}
