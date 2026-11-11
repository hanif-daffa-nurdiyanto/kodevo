import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().min(5).max(800).optional(),
  learningObjective: z.string().trim().min(5).max(800).optional(),
  order: z.number().int().positive().optional(),
})

async function getBundleTopic(trackId: string, moduleId: string, topicId: string) {
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      moduleId: true,
      module: { select: { trackId: true, track: { select: { type: true } } } },
    },
  })
  return topic?.moduleId === moduleId &&
    topic.module.trackId === trackId &&
    topic.module.track.type === TrackType.BUNDLE
    ? topic
    : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string; topicId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId, topicId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await getBundleTopic(trackId, moduleId, topicId)
  if (!existing) return NextResponse.json({ error: "Topic tidak ditemukan." }, { status: 404 })

  const topic = await db.topic.update({
    where: { id: topicId },
    data: parsed.data,
    select: { id: true, title: true, description: true, learningObjective: true, order: true },
  })

  return NextResponse.json({ topic })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string; topicId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId, topicId } = await params
  const existing = await getBundleTopic(trackId, moduleId, topicId)
  if (!existing) return NextResponse.json({ error: "Topic tidak ditemukan." }, { status: 404 })

  await db.topic.delete({ where: { id: topicId } })
  return NextResponse.json({ ok: true })
}
