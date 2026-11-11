import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  topicIds: z.array(z.string().min(1)).min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      trackId: true,
      track: { select: { type: true } },
      topics: { select: { id: true } },
    },
  })
  if (!mod || mod.trackId !== trackId || mod.track.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Module tidak ditemukan." }, { status: 404 })
  }

  const currentIds = new Set(mod.topics.map((topic) => topic.id))
  const nextIds = parsed.data.topicIds
  const uniqueNextIds = new Set(nextIds)

  if (
    uniqueNextIds.size !== nextIds.length ||
    nextIds.length !== currentIds.size ||
    nextIds.some((topicId) => !currentIds.has(topicId))
  ) {
    return NextResponse.json({ error: "Urutan topic tidak valid." }, { status: 400 })
  }

  await db.$transaction(async (tx) => {
    for (const [index, topicId] of nextIds.entries()) {
      await tx.topic.update({
        where: { id: topicId },
        data: { order: -100000 - index },
      })
    }

    for (const [index, topicId] of nextIds.entries()) {
      await tx.topic.update({
        where: { id: topicId },
        data: { order: index + 1 },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
