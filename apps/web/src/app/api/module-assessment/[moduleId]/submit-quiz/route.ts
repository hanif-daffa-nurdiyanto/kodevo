import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  answers: z.array(z.number().int().min(0).max(3)),
})

const QUIZ_PASS_THRESHOLD = 0.7

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const userId = sessionUser.id as string

  const assessment = await db.moduleAssessment.findUnique({
    where: { moduleId },
    include: {
      attempts: {
        where: { userId },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })

  // Gate: already passed
  const alreadyPassed = assessment.attempts.some((a) => a.passed)
  if (alreadyPassed) return NextResponse.json({ error: "Assessment sudah lulus" }, { status: 409 })

  // Gate: daily limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayAttempts = assessment.attempts.filter((a) => a.createdAt >= today).length
  if (todayAttempts >= 3) {
    return NextResponse.json({ error: "Batas percobaan hari ini tercapai (3x). Coba lagi besok." }, { status: 429 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { answers } = body.data
  const questions = assessment.quizQuestions as Array<{ answer: number }>

  if (answers.length !== questions.length) {
    return NextResponse.json({ error: "Jumlah jawaban tidak sesuai" }, { status: 400 })
  }

  let correct = 0
  const details = questions.map((q, i) => {
    const isCorrect = answers[i] === q.answer
    if (isCorrect) correct++
    return { isCorrect, correctAnswer: q.answer, yourAnswer: answers[i] }
  })

  const score = Math.round((correct / questions.length) * 100)
  const quizPassed = score >= QUIZ_PASS_THRESHOLD * 100

  // Create or update attempt (one attempt per day slot — create new each time)
  const attempt = await db.moduleAssessmentAttempt.create({
    data: {
      assessmentId: assessment.id,
      userId,
      quizAnswers: answers,
      quizScore: score,
      quizPassed,
    },
  })

  return NextResponse.json({ score, quizPassed, details, attemptId: attempt.id })
}
