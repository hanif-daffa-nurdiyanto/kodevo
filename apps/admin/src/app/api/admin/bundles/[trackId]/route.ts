import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(800).optional(),
  icon: z.string().trim().max(16).nullable().optional(),
  priceIdr: z.number().int().min(0).nullable().optional(),
  hasCertificate: z.boolean().optional(),
  isFree: z.boolean().optional(),
})

async function getBundle(trackId: string) {
  const bundle = await db.track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      type: true,
      _count: { select: { purchases: true } },
    },
  })
  return bundle?.type === TrackType.BUNDLE ? bundle : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  const { trackId } = await params
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await getBundle(trackId)
  if (!existing) return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })

  const data = {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon === "" ? null : parsed.data.icon } : {}),
    ...(parsed.data.hasCertificate !== undefined ? { hasCertificate: parsed.data.hasCertificate } : {}),
    ...(parsed.data.isFree !== undefined ? { isFree: parsed.data.isFree } : {}),
    ...(parsed.data.isFree === true
      ? { priceIdr: null }
      : parsed.data.priceIdr !== undefined
        ? { priceIdr: parsed.data.priceIdr }
        : {}),
  }

  const updated = await db.track.update({
    where: { id: trackId },
    data,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      icon: true,
      order: true,
      priceIdr: true,
      hasCertificate: true,
      isFree: true,
      publishedAt: true,
    },
  })

  return NextResponse.json({ bundle: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  await requireAdmin()

  const { trackId } = await params
  const existing = await getBundle(trackId)
  if (!existing) return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  if (existing._count.purchases > 0) {
    return NextResponse.json({ error: "Bundle yang sudah dibeli tidak bisa dihapus." }, { status: 409 })
  }

  await db.track.delete({ where: { id: trackId } })
  return NextResponse.json({ ok: true })
}
