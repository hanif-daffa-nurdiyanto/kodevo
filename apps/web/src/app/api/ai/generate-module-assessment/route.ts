import { NextRequest, NextResponse } from "next/server"
import { ensureModuleAssessment } from "@/lib/module-assessment"
import { z } from "zod"

const schema = z.object({ moduleId: z.string() })

function createAssessmentLogId() {
  return Math.random().toString(36).slice(2, 8)
}

function logAssessmentStep(id: string, step: string, meta?: Record<string, unknown>) {
  console.log("[module-assessment:generate]", { id, step, ...meta })
}

export async function POST(req: NextRequest) {
  const logId = createAssessmentLogId()
  logAssessmentStep(logId, "request_received")

  const internalKey = req.headers.get("x-internal-key")
  if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
    logAssessmentStep(logId, "forbidden", { hasInternalKey: !!internalKey })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rawBody = await req.json().catch(() => null)
  const body = schema.safeParse(rawBody)
  if (!body.success) {
    logAssessmentStep(logId, "invalid_request", { error: body.error.flatten() })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { moduleId } = body.data
  logAssessmentStep(logId, "validated_request", { moduleId })

  try {
    const result = await ensureModuleAssessment(moduleId, logId)
    if (!result.assessment) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      existing: result.existing,
      assessmentId: result.assessment.id,
    })
  } catch (error) {
    console.error("[module-assessment:generate]", {
      id: logId,
      step: "failed",
      moduleId,
      error,
    })
    return NextResponse.json({ error: "Gagal membuat assessment" }, { status: 500 })
  }
}
