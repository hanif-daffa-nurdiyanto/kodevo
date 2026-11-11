import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { generateCurriculum, isBroadTechnologyTopic } from "@/lib/ai"
import { z } from "zod"

const schema = z.object({
  brief: z.string().trim().min(10).max(1000),
  replaceExisting: z.boolean().default(true),
})

const INVALID_BRIEF_MESSAGE = "Brief harus berhubungan dengan programming atau teknologi. Coba arahkan ke skill teknis seperti web/app development, data/AI, cloud, DevOps, security, database, atau tooling developer."

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json({ error: "AI sedang dinonaktifkan." }, { status: 503 })
  }

  const { trackId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const bundle = await db.track.findUnique({
    where: { id: trackId },
    select: { id: true, type: true, title: true, description: true, isFree: true },
  })
  if (!bundle || bundle.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  }

  const generationGoal = `${bundle.title}. ${bundle.description}. Brief admin: ${parsed.data.brief}`
  if (!isBroadTechnologyTopic(bundle.title, bundle.description, parsed.data.brief)) {
    return NextResponse.json({ error: INVALID_BRIEF_MESSAGE }, { status: 422 })
  }

  let curriculum: Awaited<ReturnType<typeof generateCurriculum>>
  try {
    curriculum = await generateCurriculum({
      goal: generationGoal,
      learningStyle: "READ_FIRST",
      guidancePreference: "GUIDED",
      allowBroadTechnology: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOPIC") {
      return NextResponse.json({ error: INVALID_BRIEF_MESSAGE }, { status: 422 })
    }
    throw error
  }

  await db.$transaction(async (tx) => {
    if (parsed.data.replaceExisting) {
      await tx.module.deleteMany({ where: { trackId } })
    }

    const startOrder = parsed.data.replaceExisting
      ? 0
      : await tx.module.count({ where: { trackId } })

    for (const mod of curriculum.modules) {
      await tx.module.create({
        data: {
          trackId,
          title: mod.title,
          description: mod.description,
          order: startOrder + mod.order,
          isFree: bundle.isFree,
          topics: {
            create: mod.topics.map((topic) => ({
              title: topic.title,
              description: topic.description,
              order: topic.order,
              learningObjective: topic.learningObjective,
            })),
          },
        },
      })
    }
  })

  return NextResponse.json({
    ok: true,
    generated: {
      title: curriculum.title,
      modules: curriculum.modules.length,
      topics: curriculum.modules.reduce((sum, mod) => sum + mod.topics.length, 0),
    },
  })
}
