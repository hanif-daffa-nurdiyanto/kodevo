import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db, issueCertificateIfTrackComplete } from "@kodevo/db"
import { evaluateTestCode } from "@/lib/ai"
import { ensureModuleAssessment } from "@/lib/module-assessment"
import { z } from "zod"

const schema = z.object({
  attemptId: z.string(),
  code: z.record(z.string(), z.string()),
})

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
    include: { module: { include: { track: true } } },
  })
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { attemptId, code } = body.data

  const attempt = await db.moduleAssessmentAttempt.findFirst({
    where: { id: attemptId, userId, assessmentId: assessment.id },
  })
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 })
  if (!attempt.quizPassed) {
    return NextResponse.json({ error: "Quiz harus lulus terlebih dahulu" }, { status: 400 })
  }
  if (attempt.passed) {
    return NextResponse.json({ error: "Assessment sudah lulus" }, { status: 409 })
  }

  const challenge = assessment.challenge as {
    prompt: string
    requirements: string[]
    language: string
    rubric?: { passCriteria: string; hardFail: string[] }
  }
  const mod = assessment.module

  const submittedCode = Object.values(code).join("\n\n")

  const rubricSection = challenge.rubric
    ? `\nRUBRIK KELULUSAN (FIXED — tidak bisa diabaikan):
Kriteria pass: ${challenge.rubric.passCriteria}

Hard fail — langsung gagal jika salah satu tidak terpenuhi:
${challenge.rubric.hardFail.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n`
    : ""

  const evaluation = await evaluateTestCode({
    topicTitle: mod.title,
    learningObjective: challenge.prompt + rubricSection,
    level: "BEGINNER",
    exercisePrompt: challenge.prompt,
    requirements: challenge.requirements,
    code: submittedCode,
    language: challenge.language,
  })

  const challengePassed = evaluation.passed
  const allPassed = attempt.quizPassed && challengePassed

  await db.moduleAssessmentAttempt.update({
    where: { id: attemptId },
    data: {
      challengeCode: submittedCode,
      challengePassed,
      challengeFeedback: evaluation.feedback,
      passed: allPassed,
    },
  })

  // If passed: trigger next module assessment generation in background
  if (allPassed) {
    const certificateResult = await issueCertificateIfTrackComplete({
      userId,
      trackId: mod.trackId,
    })
    const nextModuleOrder = mod.order + 1
    const nextModule = await db.module.findFirst({
      where: { trackId: mod.trackId, order: nextModuleOrder },
      select: { id: true },
    })
    if (nextModule) {
      const existingNext = await db.moduleAssessment.findUnique({ where: { moduleId: nextModule.id } })
      if (!existingNext) {
        ensureModuleAssessment(nextModule.id, `next-${nextModule.id}`).catch((error) => {
          console.error("[module-assessment:background]", {
            step: "next_module_trigger_failed",
            moduleId: nextModule.id,
            previousModuleId: moduleId,
            trackId: mod.trackId,
            error,
          })
        })
      }
    }

    return NextResponse.json({
      challengePassed,
      allPassed,
      score: evaluation.totalScore,
      feedback: evaluation.feedback,
      certificate: certificateResult.issued
        ? {
            id: certificateResult.certificate.id,
            certificateNo: certificateResult.certificate.certificateNo,
            alreadyIssued: certificateResult.alreadyIssued,
          }
        : null,
    })
  }

  return NextResponse.json({
    challengePassed,
    allPassed,
    score: evaluation.totalScore,
    feedback: evaluation.feedback,
  })
}
