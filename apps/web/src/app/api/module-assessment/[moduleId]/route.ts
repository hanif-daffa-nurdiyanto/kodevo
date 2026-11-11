import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { canAccessTrackContent, db, TrackType } from "@kodevo/db"
import { ensureModuleAssessment } from "@/lib/module-assessment"

async function getSessionUserId() {
  const session = await auth()
  if (!session?.user) return null

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  if (sessionUser.id) {
    const user = await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    if (user) return user.id
  }

  if (sessionUser.email) {
    const user = await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    if (user) return user.id
  }

  return null
}

function createAssessmentLogId() {
  return Math.random().toString(36).slice(2, 8)
}

async function assertModuleAccess(moduleId: string, userId: string) {
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: { track: true },
  })

  if (!mod) {
    return { ok: false as const, response: NextResponse.json({ error: "Module not found" }, { status: 404 }) }
  }

  if (mod.track.type === TrackType.BUNDLE && !mod.track.publishedAt) {
    return { ok: false as const, response: NextResponse.json({ error: "Module not found" }, { status: 404 }) }
  }

  const canAccess = await canAccessTrackContent({
    userId,
    trackId: mod.trackId,
    moduleIsFree: mod.isFree,
  })

  if (!canAccess) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const access = await assertModuleAccess(moduleId, userId)
  if (!access.ok) return access.response

  const assessment = await db.moduleAssessment.findUnique({
    where: { moduleId },
    include: {
      attempts: {
        where: { userId },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!assessment) return NextResponse.json({ assessment: null })

  // Count today's attempts
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayAttempts = assessment.attempts.filter((a) => a.createdAt >= today).length
  const dailyLimit = 3

  const latestPassed = assessment.attempts.find((a) => a.passed)
  const latestAttempt = assessment.attempts[0] ?? null

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      quizQuestions: assessment.quizQuestions,
      challenge: assessment.challenge,
    },
    status: {
      passed: !!latestPassed,
      todayAttempts,
      dailyLimit,
      canAttempt: !latestPassed && todayAttempts < dailyLimit,
      latestAttempt: latestAttempt
        ? {
            quizPassed: latestAttempt.quizPassed,
            quizScore: latestAttempt.quizScore,
            challengePassed: latestAttempt.challengePassed,
            challengeFeedback: latestAttempt.challengeFeedback,
            passed: latestAttempt.passed,
            createdAt: latestAttempt.createdAt,
          }
        : null,
    },
  })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params
  const logId = createAssessmentLogId()
  console.log("[module-assessment:user-generate]", { id: logId, step: "request_received", moduleId })

  const userId = await getSessionUserId()
  if (!userId) {
    console.log("[module-assessment:user-generate]", { id: logId, step: "unauthorized", moduleId })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const access = await assertModuleAccess(moduleId, userId)
  if (!access.ok) {
    console.log("[module-assessment:user-generate]", { id: logId, step: "access_denied", moduleId, userId })
    return access.response
  }

  try {
    const result = await ensureModuleAssessment(moduleId, logId)
    if (!result.assessment) return NextResponse.json({ error: "Module not found" }, { status: 404 })

    console.log("[module-assessment:user-generate]", {
      id: logId,
      step: "completed",
      moduleId,
      assessmentId: result.assessment.id,
      existing: result.existing,
    })

    return NextResponse.json({
      ok: true,
      existing: result.existing,
      assessmentId: result.assessment.id,
    })
  } catch (error) {
    console.error("[module-assessment:user-generate]", {
      id: logId,
      step: "failed",
      moduleId,
      userId,
      error,
    })
    return NextResponse.json({ error: "Gagal membuat assessment. Coba lagi sebentar lagi." }, { status: 500 })
  }
}
