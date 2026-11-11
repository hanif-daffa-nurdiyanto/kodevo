import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"
import { z } from "zod"

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const body = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const promo = await db.promoCode.findUnique({ where: { id } })
  if (!promo) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  const updated = await db.promoCode.update({
    where: { id },
    data: {
      ...(body.data.isActive !== undefined ? { isActive: body.data.isActive } : {}),
      ...(body.data.maxUses !== undefined ? { maxUses: body.data.maxUses } : {}),
      ...(body.data.expiresAt !== undefined
        ? { expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null }
        : {}),
      ...(body.data.description !== undefined ? { description: body.data.description } : {}),
    },
  })

  return NextResponse.json({ promo: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const promo = await db.promoCode.findUnique({ where: { id } })
  if (!promo) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  await db.promoCode.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
