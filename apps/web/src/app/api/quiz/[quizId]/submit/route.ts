import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { recordStreak, computeCurrentStreak } from "@/lib/rate-limit"
import { sendStreakMilestoneEmail } from "@kodevo/email"
import { z } from "zod"

const schema = z.object({ answers: z.array(z.number().int().min(0).max(3)) })

const XP_PER_TOPIC = 100

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, xp: true, email: true, name: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, xp: true, email: true, name: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = dbUser.id
  const { answers } = body.data

  const quiz = await db.topicQuiz.findFirst({
    where: { id: quizId, userId },
    include: { topic: { select: { moduleId: true } } },
  })
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })

  if (quiz.passed) {
    return NextResponse.json({ error: "Quiz ini sudah lulus" }, { status: 409 })
  }

  const stored = quiz.questions as Array<{
    question: string
    options: string[]
    correct: number
    explanation: string
  }>

  if (answers.length !== stored.length) {
    return NextResponse.json({ error: "Jumlah jawaban tidak sesuai" }, { status: 400 })
  }

  const results = stored.map((q, i) => ({
    correct: answers[i] === q.correct,
    correctIndex: q.correct,
    explanation: q.explanation,
  }))

  const score = results.filter((r) => r.correct).length
  const total = stored.length
  const passed = score >= Math.ceil(total * 0.6)

  const ops: Promise<any>[] = [
    db.topicQuiz.update({
      where: { id: quizId },
      data: { passed, score, total, submittedAt: new Date() },
    }),
    recordStreak(userId),
  ]

  if (passed) {
    ops.push(
      db.user.update({ where: { id: userId }, data: { xp: { increment: XP_PER_TOPIC } } })
    )
  }

  await Promise.all(ops)

  // Check streak milestone after recording
  if (passed && dbUser.email) {
    const streaks = await db.streak.findMany({
      where: { userId },
      select: { date: true },
      orderBy: { date: "desc" },
      take: 120,
    })
    const streak = computeCurrentStreak(streaks.map((s) => s.date))
    const MILESTONES = [7, 14, 30, 100]
    if (MILESTONES.includes(streak)) {
      sendStreakMilestoneEmail(dbUser.email, dbUser.name ?? "Kamu", streak).catch(() => {})
    }
  }

  // Cleanup: once passed, delete all failed attempts for this topic (no longer needed)
  if (passed) {
    await db.topicQuiz.deleteMany({
      where: { userId, topicId: quiz.topicId, passed: false },
    })
  }

  // If passed, check if all topics in module are now complete → update enrollment
  if (passed) {
    const moduleTopics = await db.topic.findMany({
      where: { moduleId: quiz.topic.moduleId },
      select: { id: true },
    })
    const moduleTopicIds = moduleTopics.map((t) => t.id)

    const passedQuizTopics = await db.topicQuiz.findMany({
      where: { userId, topicId: { in: moduleTopicIds }, passed: true },
      select: { topicId: true },
    })
    const passedSet = new Set(passedQuizTopics.map((q) => q.topicId))
    const allDone = moduleTopicIds.every((id) => passedSet.has(id))

    if (allDone) {
      await db.enrollment.upsert({
        where: { userId_moduleId: { userId, moduleId: quiz.topic.moduleId } },
        update: { status: "COMPLETED", completedAt: new Date() },
        create: {
          userId,
          moduleId: quiz.topic.moduleId,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })
    }
  }

  return NextResponse.json({ passed, score, total, results })
}
