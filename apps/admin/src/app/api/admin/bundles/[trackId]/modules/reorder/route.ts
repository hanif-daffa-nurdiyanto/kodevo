import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  moduleIds: z.array(z.string().min(1)).min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  const { trackId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const bundle = await db.track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      type: true,
      modules: { select: { id: true } },
    },
  })
  if (!bundle || bundle.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  }

  const currentIds = new Set(bundle.modules.map((mod) => mod.id))
  const nextIds = parsed.data.moduleIds
  const uniqueNextIds = new Set(nextIds)

  if (
    uniqueNextIds.size !== nextIds.length ||
    nextIds.length !== currentIds.size ||
    nextIds.some((moduleId) => !currentIds.has(moduleId))
  ) {
    return NextResponse.json({ error: "Urutan module tidak valid." }, { status: 400 })
  }

  await db.$transaction(async (tx) => {
    for (const [index, moduleId] of nextIds.entries()) {
      await tx.module.update({
        where: { id: moduleId },
        data: { order: -100000 - index },
      })
    }

    for (const [index, moduleId] of nextIds.entries()) {
      await tx.module.update({
        where: { id: moduleId },
        data: { order: index + 1 },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
