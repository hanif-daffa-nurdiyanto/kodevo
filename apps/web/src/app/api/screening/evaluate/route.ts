import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { z } from "zod"
import { evaluateScreening } from "@/lib/ai"
import { screeningQuestions, knowledgeQuestions } from "@/lib/screening-questions"
import type { LearningStyle, GuidancePreference, Level, ScreeningAnswer } from "@/types"

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["mcq", "analysis"]),
  category: z.enum(["level", "preference"]).optional(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  targetLevel: z.enum(["UNSCREENED", "BEGINNER", "MID", "ADVANCE"]).optional(),
})

const schema = z.object({
  answers: z.record(z.string(), z.string()),
  goal: z.string().trim().max(500).optional(),
  questions: z.array(questionSchema).optional(),
})

const LEARNING_STYLE_MAP: Record<string, LearningStyle> = {
  "📖 Baca penjelasan lengkap dulu, baru coba praktik": "READ_FIRST",
  "🧩 Baca sedikit, langsung coba, baca lagi kalau stuck": "CHUNK_QUIZ",
  "⚡ Langsung tantangan dulu, baru cari penjelasan kalau mentok": "CHALLENGE_FIRST",
}

const GUIDANCE_MAP: Record<string, GuidancePreference> = {
  "🗺️ Panduan yang jelas step-by-step": "GUIDED",
  "🧭 Arah umum, selebihnya aku eksplorasi sendiri": "SEMI_GUIDED",
  "🏄 Langsung lempar ke masalah, aku cari sendiri": "INDEPENDENT",
}

function scoreToLevel(score: number): Level {
  if (score >= 5) return "ADVANCE"
  if (score >= 3) return "MID"
  return "BEGINNER"
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, level: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, level: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { answers, goal, questions } = body.data
  const dynamicLevelQuestions = questions?.filter((question) => question.category !== "preference") ?? []
  const answersWithContext = {
    ...answers,
    ...(goal ? { _roadmapGoal: goal } : {}),
    ...(questions ? { _screeningQuestions: questions } : {}),
  }

  const evaluated = dynamicLevelQuestions.length > 0
    ? await evaluateScreening({
        answers: dynamicLevelQuestions.map((question) => ({
          questionId: question.id,
          question: question.question,
          userAnswer: answers[question.id] ?? "",
          correctAnswer: question.correctAnswer,
          type: question.type,
          category: question.category,
        })) as ScreeningAnswer[],
        track: {
          title: goal ?? "Roadmap personal",
          description: `Roadmap personal berdasarkan tujuan belajar: ${goal ?? "belajar programming"}`,
          goal,
          modules: [],
        },
      })
    : null

  const legacyScore = knowledgeQuestions.reduce((acc, q) => {
    return answers[q.id] === q.correctAnswer ? acc + 1 : acc
  }, 0)
  const level = evaluated?.level ?? scoreToLevel(legacyScore)
  const score = evaluated?.score ?? legacyScore

  // Resolve preferences
  const p1Answer = answers[screeningQuestions.find((q) => q.id === "p1")?.id ?? "p1"] ?? ""
  const p2Answer = answers[screeningQuestions.find((q) => q.id === "p2")?.id ?? "p2"] ?? ""
  const learningStyle: LearningStyle = LEARNING_STYLE_MAP[p1Answer] ?? "READ_FIRST"
  const guidancePreference: GuidancePreference = GUIDANCE_MAP[p2Answer] ?? "GUIDED"

  await db.$transaction([
    db.screeningResult.upsert({
      where: { userId: dbUser.id },
      create: { userId: dbUser.id, score, level, answers: answersWithContext },
      update: { score, level, answers: answersWithContext, completedAt: new Date() },
    }),
    db.user.update({
      where: { id: dbUser.id },
      data: { level, learningStyle, guidancePreference },
    }),
  ])

  return NextResponse.json({ level, learningStyle, guidancePreference, score })
}
