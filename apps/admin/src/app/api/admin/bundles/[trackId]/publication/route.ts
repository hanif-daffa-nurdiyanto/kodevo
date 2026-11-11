import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  published: z.boolean(),
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
      isFree: true,
      priceIdr: true,
      publishedAt: true,
      _count: { select: { modules: true } },
    },
  })

  if (!bundle || bundle.type !== TrackType.BUNDLE) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  }

  if (parsed.data.published && bundle._count.modules === 0) {
    return NextResponse.json({ error: "Bundle minimal harus punya 1 module sebelum publish." }, { status: 409 })
  }

  if (parsed.data.published && !bundle.isFree && (!bundle.priceIdr || bundle.priceIdr <= 0)) {
    return NextResponse.json({ error: "Harga bundle harus dikonfigurasi sebelum publish." }, { status: 409 })
  }

  const updated = await db.track.update({
    where: { id: trackId },
    data: { publishedAt: parsed.data.published ? bundle.publishedAt ?? new Date() : null },
    select: { id: true, publishedAt: true },
  })

  return NextResponse.json({ bundle: updated })
}
