import { NextRequest, NextResponse } from "next/server"
import { applyCreditTransactionInTx, db, TrackType } from "@kodevo/db"
import type { Prisma } from "@kodevo/db/generated/client"
import { detectTierFromPayload, getExpiryFromBilling } from "@/lib/mayar"
import { sendPremiumWelcomeEmail, sendPurchaseReceiptEmail } from "@kodevo/email"

const PAYMENT_SUCCESS_STATUSES = ["paid", "settlement", "success", "completed"]

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function getNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function getDescriptionTag(description: string, key: string): string | undefined {
  const match = description.match(new RegExp(`${key}:([a-zA-Z0-9_-]+)`))
  return match?.[1]
}

function getDescriptionNumber(description: string, key: string): number {
  const value = getDescriptionTag(description, key)
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

async function recordPromoRedemptionInTx(params: {
  tx: Prisma.TransactionClient
  promoCodeId?: string
  userId: string
  target: "CREDIT" | "BUNDLE"
  refId?: string
  transactionId: string
  originalAmountIdr: number
  discountAmountIdr: number
  finalAmountIdr: number
}) {
  if (!params.promoCodeId || params.discountAmountIdr <= 0) return false

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

  const promo = await params.tx.promoCode.findUnique({
    where: { id: params.promoCodeId },
    select: { id: true },
  })
  if (!promo) return false

  await params.tx.promoRedemption.create({
    data: {
      promoCodeId: params.promoCodeId,
      userId: params.userId,
      target: params.target,
      refId: params.refId ?? null,
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

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // event field can be string "testing" or object { received: "payment.received" }
  const eventField = payload.event
  const eventType = typeof eventField === "string"
    ? eventField
    : (eventField as Record<string, unknown>)?.received as string ?? ""

  // Immediately ack test events from Mayar dashboard
  if (eventType === "testing") return NextResponse.json({ received: true })

  const data = (payload.data ?? payload) as Record<string, unknown>
  const status = (data.status ?? payload.status ?? "") as string

  if (!PAYMENT_SUCCESS_STATUSES.includes(status.toLowerCase())) {
    return NextResponse.json({ received: true })
  }

  // Extract user reference — try multiple fields Mayar may send
  const refId = getString(data.referenceId ?? data.ref ?? payload.referenceId ?? payload.ref)
  const description = getString(data.description ?? payload.description) ?? ""
  // uid: and promo: extracted from description written at payment creation
  const descUserId = getDescriptionTag(description, "uid")
  const promoCodeId = getDescriptionTag(description, "promo")
  const paymentType = getDescriptionTag(description, "type")
  const creditAmount = Number(getDescriptionTag(description, "credits"))
  const trackId = getDescriptionTag(description, "trackId")

  const email = (
    data.customerEmail ??
    data.email ??
    (data.customer as Record<string, unknown>)?.email ??
    payload.customerEmail ??
    payload.email
  ) as string | undefined

  const amount = getNumber(data.amount ?? data.totalAmount ?? data.grandTotal)
  const originalAmountIdr = getDescriptionNumber(description, "original") || amount
  const discountAmountIdr = getDescriptionNumber(description, "discount")
  const finalAmountIdr = getDescriptionNumber(description, "final") || amount
  const transactionId = getString(
    data.id ?? data.transactionId ?? data.paymentId ?? payload.id ?? payload.transactionId ?? refId
  )
  const productName = getString(data.productName ?? data.productSlug ?? payload.productName)
  const { tier, billing } = detectTierFromPayload(amount, productName)
  const expiresAt = getExpiryFromBilling(billing)

  let user: { id: string; name: string | null; isPremium: boolean; isPro: boolean } | null = null

  // Priority: uid from description (most reliable with API flow) → refId → email
  for (const id of [descUserId, refId].filter(Boolean)) {
    user = await db.user.findUnique({
      where: { id: id! },
      select: { id: true, name: true, isPremium: true, isPro: true },
    })
    if (user) break
  }
  if (!user && email) {
    user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, isPremium: true, isPro: true },
    })
  }

  if (!user) {
    console.error("[mayar webhook] user not found — ref:", refId, "email:", email)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (paymentType === "credit_topup") {
    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 })
    }
    if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: "Invalid credit amount" }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findFirst({
        where: { type: "TOPUP", refId: transactionId },
        select: { id: true },
      })
      if (existing) return { alreadyProcessed: true }

      const credit = await applyCreditTransactionInTx(tx, {
        userId: user.id,
        type: "TOPUP",
        amount: creditAmount,
        action: "CREDIT_TOPUP",
        refId: transactionId,
      })

      const promoRecorded = await recordPromoRedemptionInTx({
        tx,
        promoCodeId,
        userId: user.id,
        target: "CREDIT",
        refId: getDescriptionTag(description, "packageId"),
        transactionId,
        originalAmountIdr,
        discountAmountIdr,
        finalAmountIdr,
      })

      return { alreadyProcessed: false, balanceAfter: credit.balanceAfter, promoRecorded }
    })

    return NextResponse.json({ received: true, type: paymentType, ...result })
  }

  if (paymentType === "bundle") {
    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 })
    }
    if (!trackId) {
      return NextResponse.json({ error: "Missing bundle track id" }, { status: 400 })
    }

    const track = await db.track.findUnique({
      where: { id: trackId },
      select: { id: true, type: true },
    })
    if (!track || track.type !== TrackType.BUNDLE) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const result = await db.$transaction(async (tx) => {
      const existing = await tx.bundlePurchase.findFirst({
        where: { mayarTransactionId: transactionId },
        select: { id: true },
      })
      if (existing) return { alreadyProcessed: true }

      await tx.bundlePurchase.upsert({
        where: { userId_trackId: { userId: user.id, trackId } },
        create: {
          userId: user.id,
          trackId,
          amountPaidIdr: amount,
          mayarTransactionId: transactionId,
        },
        update: {
          amountPaidIdr: amount,
          mayarTransactionId: transactionId,
        },
      })

      const promoRecorded = await recordPromoRedemptionInTx({
        tx,
        promoCodeId,
        userId: user.id,
        target: "BUNDLE",
        refId: trackId,
        transactionId,
        originalAmountIdr,
        discountAmountIdr,
        finalAmountIdr,
      })

      return { alreadyProcessed: false, promoRecorded }
    })

    return NextResponse.json({ received: true, type: paymentType, ...result })
  }

  const wasAlreadyPaid = tier === "pro" ? user.isPro : user.isPremium

  await db.user.update({
    where: { id: user.id },
    data:
      tier === "pro"
        ? { isPremium: true, isPro: true, proExpiresAt: expiresAt }
        : { isPremium: true, premiumExpiresAt: expiresAt },
  })

  let promoDetails: { code: string; type: string; discountPercent: number | null; discountAmount: number | null } | undefined
  if (promoCodeId) {
    const [promo] = await Promise.all([
      db.promoCode.findUnique({
        where: { id: promoCodeId },
        select: { code: true, type: true, discountPercent: true, discountAmount: true },
      }),
      db.$transaction([
        db.promoRedemption.upsert({
          where: { promoCodeId_userId: { promoCodeId, userId: user.id } },
          create: { promoCodeId, userId: user.id },
          update: {},
        }),
        db.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        }),
      ]).catch(() => {}),
    ])
    if (promo) promoDetails = promo
  }

  if (!wasAlreadyPaid && email) {
    sendPurchaseReceiptEmail(email, user.name ?? "Kamu", {
      tier,
      billing,
      amount,
      transactionId,
      paidAt: new Date(),
      promo: promoDetails,
    }).catch(() => {})
    sendPremiumWelcomeEmail(email, user.name ?? "Kamu").catch(() => {})
  }

  return NextResponse.json({ received: true })
}
