import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(5).max(800),
  learningObjective: z.string().trim().min(5).max(800),
  order: z.number().int().positive().optional(),
})

async function getBundleModule(trackId: string, moduleId: string) {
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: { id: true, trackId: true, track: { select: { type: true } } },
  })
  return mod?.trackId === trackId && mod.track.type === TrackType.BUNDLE ? mod : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const mod = await getBundleModule(trackId, moduleId)
  if (!mod) return NextResponse.json({ error: "Module tidak ditemukan." }, { status: 404 })

  const order = parsed.data.order ?? (await db.topic.count({ where: { moduleId } })) + 1
  const topic = await db.topic.create({
    data: {
      moduleId,
      title: parsed.data.title,
      description: parsed.data.description,
      learningObjective: parsed.data.learningObjective,
      order,
    },
    select: { id: true, title: true, description: true, learningObjective: true, order: true },
  })

  return NextResponse.json({ topic }, { status: 201 })
}
