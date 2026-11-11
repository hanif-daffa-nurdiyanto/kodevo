import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).nullable().optional(),
  credits: z.number().int().positive(),
  priceIdr: z.number().int().min(0),
  isActive: z.boolean().default(true),
  order: z.number().int().nullable().optional(),
})

export async function POST(req: NextRequest) {
  await requireAdmin()

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const pkg = await db.creditPackage.create({
    data: {
      label: parsed.data.label,
      description: parsed.data.description || null,
      credits: parsed.data.credits,
      priceIdr: parsed.data.priceIdr,
      isActive: parsed.data.isActive,
      order: parsed.data.order ?? null,
    },
  })

  return NextResponse.json({ package: pkg }, { status: 201 })
}
