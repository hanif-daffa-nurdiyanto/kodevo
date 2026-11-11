import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransaction, db, getAICreditDecision, InsufficientCreditError } from "@kodevo/db"
import { generateCurriculum } from "@/lib/ai"
import { ensureModuleAssessment } from "@/lib/module-assessment"
import { checkAIRateLimit, incrementAIUsage, checkCurriculumDailyLimit, PREMIUM_CURRICULUM_DAILY_LIMIT, CREDIT_COST } from "@/lib/rate-limit"
import { z } from "zod"

const schema = z.object({
  goal: z.string().min(3, "Minimal 3 karakter").max(200),
})

export async function POST(req: NextRequest) {
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json(
      { error: "Layanan AI sedang dalam maintenance. Silakan coba beberapa saat lagi." },
      { status: 503 }
    )
  }

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, isPremium: true, learningStyle: true, guidancePreference: true },
      })
    : sessionUser.email
    ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, isPremium: true, learningStyle: true, guidancePreference: true },
      })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })

  const rl = await checkAIRateLimit(dbUser.id, dbUser.isPremium)
  if (!rl.allowed) {
    const msg = rl.limitedBy === "weekly"
      ? "Kredit mingguan habis. Reset setiap Senin."
      : "Kredit harian habis. Coba lagi besok."
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  const { allowed: currAllowed } = await checkCurriculumDailyLimit(dbUser.id)
  if (!currAllowed) {
    return NextResponse.json(
      { error: `Batas pembuatan kurikulum hari ini tercapai (${PREMIUM_CURRICULUM_DAILY_LIMIT}/hari). Coba lagi besok.` },
      { status: 429 }
    )
  }

  const { goal } = body.data
  const creditDecision = await getAICreditDecision({ userId: dbUser.id, action: "CURRICULUM" })

  if (creditDecision.shouldDebit) {
    try {
      await applyCreditTransaction({
        userId: dbUser.id,
        type: "DEBIT",
        amount: creditDecision.debitAmount,
        action: "CURRICULUM",
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

  let curriculum: Awaited<ReturnType<typeof generateCurriculum>>
  try {
    curriculum = await generateCurriculum({
      goal,
      learningStyle: dbUser.learningStyle,
      guidancePreference: dbUser.guidancePreference,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INVALID_TOPIC") {
      return NextResponse.json(
        { error: "Kurikulum hanya bisa dibuat untuk topik programming atau software development." },
        { status: 422 }
      )
    }
    throw err
  }

  const slug = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

  const track = await db.track.create({
    data: {
      title: curriculum.title,
      description: curriculum.description,
      slug,
      icon: curriculum.icon,
      userId: dbUser.id,
      goal,
      isFree: true,
      modules: {
        create: curriculum.modules.map((mod) => ({
          title: mod.title,
          description: mod.description,
          order: mod.order,
          isFree: true,
          topics: {
            create: mod.topics.map((topic) => ({
              title: topic.title,
              description: topic.description,
              order: topic.order,
              learningObjective: topic.learningObjective,
            })),
          },
        })),
      },
    },
  })

  await incrementAIUsage(dbUser.id, CREDIT_COST.CURRICULUM)

  // Trigger Module 1 assessment generation in background
  const module1 = await db.module.findFirst({
    where: { trackId: track.id, order: 1 },
    select: { id: true },
  })
  if (module1) {
    ensureModuleAssessment(module1.id, `curriculum-${track.id}`).catch((error) => {
      console.error("[module-assessment:background]", {
        step: "curriculum_trigger_failed",
        moduleId: module1.id,
        trackId: track.id,
        error,
      })
    })
  }

  return NextResponse.json({ slug: track.slug, title: track.title })
}
