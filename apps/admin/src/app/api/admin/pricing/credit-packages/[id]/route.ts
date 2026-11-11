import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  credits: z.number().int().positive().optional(),
  priceIdr: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()

  const { id } = await params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await db.creditPackage.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Paket credit tidak ditemukan." }, { status: 404 })

  const pkg = await db.creditPackage.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description === "" ? null : parsed.data.description,
    },
  })

  return NextResponse.json({ package: pkg })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()

  const { id } = await params
  const existing = await db.creditPackage.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Paket credit tidak ditemukan." }, { status: 404 })

  await db.creditPackage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
