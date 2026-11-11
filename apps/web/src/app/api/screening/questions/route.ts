import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { generateRoadmapScreeningQuestions } from "@/lib/ai"
import { screeningQuestions } from "@/lib/screening-questions"

const preferenceQuestions = screeningQuestions.filter((question) => question.category === "preference")

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const goal = req.nextUrl.searchParams.get("goal")?.trim()
  if (!goal || goal.length < 3) return NextResponse.json({ error: "Missing goal" }, { status: 400 })

  try {
    const questions = await generateRoadmapScreeningQuestions(goal)
    return NextResponse.json({
      source: "generated",
      goal,
      questions: [
        ...questions.map((question) => ({ ...question, category: "level" })),
        ...preferenceQuestions,
      ],
    })
  } catch (error) {
    console.warn("[screening/questions] fallback", {
      goal,
      error: error instanceof Error ? error.message : String(error),
    })
    const fallback = screeningQuestions.map((question) => ({
      ...question,
      question: question.category === "level"
        ? `${question.question} (Jawab dalam konteks tujuan belajar: ${goal})`
        : question.question,
    }))

    return NextResponse.json({
      source: "fallback",
      goal,
      questions: fallback,
    })
  }
}
