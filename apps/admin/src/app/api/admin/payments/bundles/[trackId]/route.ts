import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(500).optional(),
  icon: z.string().max(16).nullable().optional(),
  priceIdr: z.number().int().min(0).nullable().optional(),
  hasCertificate: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  const { trackId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await db.track.findUnique({
    where: { id: trackId },
    select: { id: true, type: true },
  })
  if (!existing || existing.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Bundle track tidak ditemukan" }, { status: 404 })
  }

  const updated = await db.track.update({
    where: { id: trackId },
    data: parsed.data,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      icon: true,
      priceIdr: true,
      hasCertificate: true,
    },
  })

  return NextResponse.json({ bundle: updated })
}
