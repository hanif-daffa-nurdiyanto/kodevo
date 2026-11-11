import { db } from "@kodevo/db"
import type { Prisma } from "@kodevo/db/generated/client"
import { MAYAR_MIN_PAYMENT_AMOUNT_IDR } from "@/lib/mayar"

export type PromoCheckoutTarget = "CREDIT" | "BUNDLE"

type PromoScope = {
  target: PromoCheckoutTarget
  refId: string
  originalAmountIdr: number
}

export type PromoQuote = {
  promoCodeId: string
  code: string
  type: "PERCENT_OFF" | "AMOUNT_OFF"
  description: string | null
  originalAmountIdr: number
  discountAmountIdr: number
  finalAmountIdr: number
}

export class PromoValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "PromoValidationError"
    this.status = status
  }
}

export function normalizePromoTarget(value: string): PromoCheckoutTarget | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === "CREDIT" || normalized === "CREDIT_TOPUP") return "CREDIT"
  if (normalized === "BUNDLE") return "BUNDLE"
  return null
}

export function calculateDiscountAmount(params: {
  type: "PERCENT_OFF" | "AMOUNT_OFF"
  originalAmountIdr: number
  discountPercent: number | null
  discountAmount: number | null
  maxDiscountIdr: number | null
}): number {
  const rawDiscount = params.type === "PERCENT_OFF"
    ? Math.round(params.originalAmountIdr * ((params.discountPercent ?? 0) / 100))
    : params.discountAmount ?? 0
  const cappedDiscount = params.maxDiscountIdr ? Math.min(rawDiscount, params.maxDiscountIdr) : rawDiscount
  if (cappedDiscount >= params.originalAmountIdr) return params.originalAmountIdr

  const maxCheckoutDiscount = Math.max(0, params.originalAmountIdr - MAYAR_MIN_PAYMENT_AMOUNT_IDR)
  return Math.max(0, Math.min(cappedDiscount, maxCheckoutDiscount))
}

export async function resolvePromoScope(target: PromoCheckoutTarget, refId: string): Promise<PromoScope> {
  if (target === "CREDIT") {
    const creditPackage = await db.creditPackage.findFirst({
      where: { id: refId, isActive: true },
      select: { id: true, priceIdr: true },
    })
    if (!creditPackage) throw new PromoValidationError("Paket credit tidak tersedia.", 404)
    return { target, refId: creditPackage.id, originalAmountIdr: creditPackage.priceIdr }
  }

  const bundle = await db.track.findFirst({
    where: { id: refId, type: "BUNDLE", publishedAt: { not: null } },
    select: { id: true, isFree: true, priceIdr: true },
  })
  if (!bundle) throw new PromoValidationError("Bundle tidak ditemukan.", 404)
  if (bundle.isFree || !bundle.priceIdr || bundle.priceIdr <= 0) {
    throw new PromoValidationError("Promo hanya bisa dipakai untuk bundle berbayar.", 400)
  }
  return { target, refId: bundle.id, originalAmountIdr: bundle.priceIdr }
}

export async function getPromoQuote(params: {
  userId: string
  code?: string | null
  target: PromoCheckoutTarget
  refId: string
  originalAmountIdr: number
}): Promise<PromoQuote | null> {
  const code = params.code?.trim().toUpperCase()
  if (!code) return null

  const promo = await db.promoCode.findUnique({
    where: { code },
    include: { redemptions: { where: { userId: params.userId }, select: { id: true } } },
  })

  if (!promo || !promo.isActive) {
    throw new PromoValidationError("Kode promo tidak ditemukan atau tidak aktif", 404)
  }
  if (promo.type !== "PERCENT_OFF" && promo.type !== "AMOUNT_OFF") {
    throw new PromoValidationError("Kode promo ini tidak berlaku untuk checkout bundle atau credit.", 400)
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    throw new PromoValidationError("Kode promo sudah kadaluarsa", 400)
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    throw new PromoValidationError("Kode promo sudah habis digunakan", 400)
  }
  if (promo.redemptions.length > 0) {
    throw new PromoValidationError("Kamu sudah pernah menggunakan kode ini", 400)
  }
  if (promo.target !== "ALL" && promo.target !== params.target) {
    throw new PromoValidationError("Kode promo tidak berlaku untuk checkout ini.", 400)
  }
  if (promo.creditPackageId && (params.target !== "CREDIT" || promo.creditPackageId !== params.refId)) {
    throw new PromoValidationError("Kode promo tidak berlaku untuk paket credit ini.", 400)
  }
  if (promo.trackId && (params.target !== "BUNDLE" || promo.trackId !== params.refId)) {
    throw new PromoValidationError("Kode promo tidak berlaku untuk bundle ini.", 400)
  }
  if (promo.minAmountIdr && params.originalAmountIdr < promo.minAmountIdr) {
    throw new PromoValidationError("Nominal checkout belum memenuhi minimum promo.", 400)
  }

  const discountAmountIdr = calculateDiscountAmount({
    type: promo.type,
    originalAmountIdr: params.originalAmountIdr,
    discountPercent: promo.discountPercent,
    discountAmount: promo.discountAmount,
    maxDiscountIdr: promo.maxDiscountIdr,
  })

  return {
    promoCodeId: promo.id,
    code: promo.code,
    type: promo.type,
    description: promo.description,
    originalAmountIdr: params.originalAmountIdr,
    discountAmountIdr,
    finalAmountIdr: Math.max(0, params.originalAmountIdr - discountAmountIdr),
  }
}

export function promoDescriptionTags(quote: PromoQuote | null): string {
  if (!quote) return ""
  return ` | promo:${quote.promoCodeId} | promoCode:${quote.code} | original:${quote.originalAmountIdr} | discount:${quote.discountAmountIdr} | final:${quote.finalAmountIdr}`
}

export async function recordPromoRedemptionInTx(params: {
  tx: Prisma.TransactionClient
  promoCodeId: string
  userId: string
  target: PromoCheckoutTarget
  refId: string
  transactionId: string
  originalAmountIdr: number
  discountAmountIdr: number
  finalAmountIdr: number
}): Promise<boolean> {
  if (params.discountAmountIdr <= 0) return false

  const existing = await params.tx.promoRedemption.findFirst({
    where: {
      OR: [
        { mayarTransactionId: params.transactionId },
        { promoCodeId: params.promoCodeId, userId: params.userId },
      ],
    },
    select: { id: true },
  })
  if (existing) return false

  await params.tx.promoRedemption.create({
    data: {
      promoCodeId: params.promoCodeId,
      userId: params.userId,
      target: params.target,
      refId: params.refId,
      discountAmountIdr: params.discountAmountIdr,
      originalAmountIdr: params.originalAmountIdr,
      finalAmountIdr: params.finalAmountIdr,
      mayarTransactionId: params.transactionId,
    },
  })
  await params.tx.promoCode.update({
    where: { id: params.promoCodeId },
    data: { usedCount: { increment: 1 } },
  })

  return true
}
