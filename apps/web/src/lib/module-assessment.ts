import { db } from "@kodevo/db"
import { generateModuleAssessment } from "@/lib/ai"

const MODULE_ROLES = ["Fondasi", "Konsep Inti", "Penerapan Nyata", "Build Project"] as const

export async function ensureModuleAssessment(moduleId: string, logId = "manual") {
  console.log("[module-assessment:ensure]", { id: logId, step: "checking_existing", moduleId })

  const existing = await db.moduleAssessment.findUnique({ where: { moduleId } })
  if (existing) {
    console.log("[module-assessment:ensure]", {
      id: logId,
      step: "existing_assessment_found",
      moduleId,
      assessmentId: existing.id,
    })
    return { assessment: existing, existing: true }
  }

  console.log("[module-assessment:ensure]", { id: logId, step: "loading_module", moduleId })
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      topics: { orderBy: { order: "asc" } },
      track: true,
    },
  })
  if (!mod) {
    console.log("[module-assessment:ensure]", { id: logId, step: "module_not_found", moduleId })
    return { assessment: null, existing: false }
  }

  const roleIndex = Math.min(Math.max(mod.order - 1, 0), MODULE_ROLES.length - 1)
  const moduleRole = MODULE_ROLES[roleIndex]
  console.log("[module-assessment:ensure]", {
    id: logId,
    step: "module_loaded",
    moduleId,
    moduleTitle: mod.title,
    moduleOrder: mod.order,
    moduleRole,
    topicCount: mod.topics.length,
    trackId: mod.trackId,
    trackTitle: mod.track.title,
  })

  const assessment = await generateModuleAssessment({
    moduleTitle: mod.title,
    moduleDescription: mod.description,
    moduleRole,
    topics: mod.topics.map((topic) => ({
      title: topic.title,
      learningObjective: topic.learningObjective,
    })),
    trackTitle: mod.track.title,
    trackGoal: mod.track.goal ?? mod.track.description,
    level: "BEGINNER",
  })

  console.log("[module-assessment:ensure]", {
    id: logId,
    step: "ai_generation_completed",
    moduleId,
    quizCount: assessment.quizQuestions.length,
    challengeLanguage: assessment.challenge.language,
    requirementCount: assessment.challenge.requirements.length,
    starterFiles: Object.keys(assessment.challenge.starterCode),
  })

  const created = await db.moduleAssessment.upsert({
    where: { moduleId },
    update: {},
    create: {
      moduleId,
      quizQuestions: assessment.quizQuestions,
      challenge: assessment.challenge,
    },
  })

  console.log("[module-assessment:ensure]", {
    id: logId,
    step: "assessment_saved",
    moduleId,
    assessmentId: created.id,
  })

  return { assessment: created, existing: false }
}
