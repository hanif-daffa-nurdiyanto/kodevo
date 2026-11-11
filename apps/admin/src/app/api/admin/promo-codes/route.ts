import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"
import { z } from "zod"

const createSchema = z.object({
  code: z.string().min(2).max(32).transform((v) => v.trim().toUpperCase()),
  type: z.enum(["PERCENT_OFF", "AMOUNT_OFF"]),
  target: z.enum(["ALL", "CREDIT", "BUNDLE"]).default("ALL"),
  discountPercent: z.number().int().min(1).max(100).optional(),
  discountAmount: z.number().int().min(1).optional(),
  minAmountIdr: z.number().int().min(1).optional(),
  maxDiscountIdr: z.number().int().min(1).optional(),
  creditPackageId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  description: z.string().optional(),
})

export async function GET() {
  await requireAdmin()

  const promos = await db.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  })

  return NextResponse.json({ promos })
}

export async function POST(req: NextRequest) {
  await requireAdmin()

  const body = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  const {
    code,
    type,
    target,
    discountPercent,
    discountAmount,
    minAmountIdr,
    maxDiscountIdr,
    creditPackageId,
    trackId,
    maxUses,
    expiresAt,
    description,
  } = body.data

  if (type === "PERCENT_OFF" && !discountPercent) {
    return NextResponse.json({ error: "discountPercent diperlukan untuk PERCENT_OFF" }, { status: 400 })
  }
  if (type === "AMOUNT_OFF" && !discountAmount) {
    return NextResponse.json({ error: "discountAmount diperlukan untuk AMOUNT_OFF" }, { status: 400 })
  }
  if (type === "AMOUNT_OFF" && maxDiscountIdr) {
    return NextResponse.json({ error: "maxDiscountIdr hanya dipakai untuk diskon persen." }, { status: 400 })
  }
  if (target !== "CREDIT" && creditPackageId) {
    return NextResponse.json({ error: "creditPackageId hanya boleh dipakai untuk target CREDIT." }, { status: 400 })
  }
  if (target !== "BUNDLE" && trackId) {
    return NextResponse.json({ error: "trackId hanya boleh dipakai untuk target BUNDLE." }, { status: 400 })
  }

  if (creditPackageId) {
    const creditPackage = await db.creditPackage.findFirst({
      where: { id: creditPackageId, isActive: true },
      select: { id: true },
    })
    if (!creditPackage) return NextResponse.json({ error: "Paket credit tidak ditemukan atau tidak aktif." }, { status: 400 })
  }

  if (trackId) {
    const bundle = await db.track.findFirst({
      where: { id: trackId, type: "BUNDLE" },
      select: { id: true },
    })
    if (!bundle) return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 400 })
  }

  const existing = await db.promoCode.findUnique({ where: { code } })
  if (existing) return NextResponse.json({ error: "Kode sudah digunakan" }, { status: 409 })

  const promo = await db.promoCode.create({
    data: {
      code,
      type,
      target,
      discountPercent: type === "PERCENT_OFF" ? discountPercent : null,
      discountAmount: type === "AMOUNT_OFF" ? discountAmount : null,
      minAmountIdr: minAmountIdr ?? null,
      maxDiscountIdr: type === "PERCENT_OFF" ? maxDiscountIdr ?? null : null,
      creditPackageId: target === "CREDIT" ? creditPackageId ?? null : null,
      trackId: target === "BUNDLE" ? trackId ?? null : null,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description: description ?? null,
    },
  })

  return NextResponse.json({ promo }, { status: 201 })
}
