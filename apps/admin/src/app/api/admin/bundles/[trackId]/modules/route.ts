import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(5).max(800),
  order: z.number().int().positive().optional(),
  isFree: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  const { trackId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const bundle = await db.track.findUnique({
    where: { id: trackId },
    select: { id: true, type: true, isFree: true },
  })
  if (!bundle || bundle.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  }

  const order = parsed.data.order ?? (await db.module.count({ where: { trackId } })) + 1
  const mod = await db.module.create({
    data: {
      trackId,
      title: parsed.data.title,
      description: parsed.data.description,
      order,
      isFree: bundle.isFree ? parsed.data.isFree ?? true : false,
    },
    select: { id: true, title: true, description: true, order: true, isFree: true },
  })

  return NextResponse.json({ module: mod }, { status: 201 })
}
