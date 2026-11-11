import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().min(5).max(800).optional(),
  order: z.number().int().positive().optional(),
  isFree: z.boolean().optional(),
})

async function getBundleModule(trackId: string, moduleId: string) {
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: { id: true, trackId: true, track: { select: { type: true, isFree: true } } },
  })
  return mod?.trackId === trackId && mod.track.type === TrackType.BUNDLE ? mod : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await getBundleModule(trackId, moduleId)
  if (!existing) return NextResponse.json({ error: "Module tidak ditemukan." }, { status: 404 })

  const data = {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
    ...(existing.track.isFree && parsed.data.isFree !== undefined ? { isFree: parsed.data.isFree } : {}),
    ...(!existing.track.isFree ? { isFree: false } : {}),
  }

  const mod = await db.module.update({
    where: { id: moduleId },
    data,
    select: { id: true, title: true, description: true, order: true, isFree: true },
  })

  return NextResponse.json({ module: mod })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ trackId: string; moduleId: string }> }
) {
  await requireAdmin()

  const { trackId, moduleId } = await params
  const existing = await getBundleModule(trackId, moduleId)
  if (!existing) return NextResponse.json({ error: "Module tidak ditemukan." }, { status: 404 })

  const result = await db.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } })

    const remainingModules = await tx.module.count({ where: { trackId } })
    if (remainingModules === 0) {
      await tx.track.update({
        where: { id: trackId },
        data: { publishedAt: null },
      })
    }

    return { remainingModules, unpublished: remainingModules === 0 }
  })

  return NextResponse.json({ ok: true, ...result })
}
