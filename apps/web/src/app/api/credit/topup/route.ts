import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { applyCreditTransactionInTx, db } from "@kodevo/db"
import { MAYAR_API_KEY, MAYAR_MIN_PAYMENT_AMOUNT_IDR, MayarApiError, createMayarPayment } from "@/lib/mayar"
import { getPromoQuote, promoDescriptionTags, PromoValidationError, recordPromoRedemptionInTx } from "@/lib/promos"
import { z } from "zod"

const schema = z.object({
  packageId: z.string().trim().min(1).optional(),
  credits: z.number().int().positive().optional(),
  promoCode: z.string().trim().min(1).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, name: true, email: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, name: true, email: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const creditPackage = body.data.packageId
    ? await db.creditPackage.findFirst({
        where: { id: body.data.packageId, isActive: true },
        select: { id: true, label: true, credits: true, priceIdr: true },
      })
    : body.data.credits
    ? await db.creditPackage.findFirst({
        where: { credits: body.data.credits, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, label: true, credits: true, priceIdr: true },
      })
    : null

  if (!creditPackage) {
    return NextResponse.json({ error: "Paket credit tidak tersedia." }, { status: 400 })
  }

  const amount = creditPackage.priceIdr
  const credits = creditPackage.credits
  let promoQuote = null
  try {
    promoQuote = await getPromoQuote({
      userId: dbUser.id,
      code: body.data.promoCode,
      target: "CREDIT",
      refId: creditPackage.id,
      originalAmountIdr: amount,
    })
  } catch (error) {
    if (error instanceof PromoValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const finalAmount = promoQuote?.finalAmountIdr ?? amount

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const redirectUrl = `${appUrl}/credits?payment=done`

  if (finalAmount <= 0 && promoQuote) {
    const transactionId = `promo_free:credit:${promoQuote.promoCodeId}:${dbUser.id}:${creditPackage.id}`
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findFirst({
        where: { type: "TOPUP", refId: transactionId },
        select: { id: true },
      })
      if (existing) return { alreadyProcessed: true }

      const credit = await applyCreditTransactionInTx(tx, {
        userId: dbUser.id,
        type: "TOPUP",
        amount: credits,
        action: "CREDIT_TOPUP",
        refId: transactionId,
      })

      const promoRecorded = await recordPromoRedemptionInTx({
        tx,
        promoCodeId: promoQuote.promoCodeId,
        userId: dbUser.id,
        target: "CREDIT",
        refId: creditPackage.id,
        transactionId,
        originalAmountIdr: amount,
        discountAmountIdr: promoQuote.discountAmountIdr,
        finalAmountIdr: promoQuote.finalAmountIdr,
      })

      return { alreadyProcessed: false, balanceAfter: credit.balanceAfter, promoRecorded }
    })

    return NextResponse.json({
      url: redirectUrl,
      freeCheckout: true,
      packageId: creditPackage.id,
      credits,
      amount: 0,
      originalAmountIdr: amount,
      discountAmountIdr: promoQuote.discountAmountIdr,
      promoCode: promoQuote.code,
      ...result,
    })
  }

  if (!MAYAR_API_KEY) return NextResponse.json({ error: "Mayar API belum dikonfigurasi." }, { status: 503 })
  if (finalAmount < MAYAR_MIN_PAYMENT_AMOUNT_IDR) {
    return NextResponse.json(
      {
        error: `Harga paket minimal ${formatRupiah(MAYAR_MIN_PAYMENT_AMOUNT_IDR)} untuk checkout Mayar.`,
      },
      { status: 400 }
    )
  }

  try {
    const { link } = await createMayarPayment({
      name: dbUser.name ?? "Pengguna Kodevo",
      email: dbUser.email ?? "",
      amount: finalAmount,
      redirectUrl,
      description: `Kodevo Credit | uid:${dbUser.id} | type:credit_topup | credits:${credits} | packageId:${creditPackage.id}${promoDescriptionTags(promoQuote)}`,
    })
    return NextResponse.json({
      url: link,
      packageId: creditPackage.id,
      credits,
      amount: finalAmount,
      originalAmountIdr: amount,
      discountAmountIdr: promoQuote?.discountAmountIdr ?? 0,
      promoCode: promoQuote?.code ?? null,
    })
  } catch (error) {
    console.error("[credit/topup]", error)
    if (error instanceof MayarApiError) {
      return NextResponse.json({ error: `Mayar menolak checkout: ${error.publicMessage}` }, { status: 502 })
    }
    return NextResponse.json({ error: "Gagal membuat link top-up. Silakan coba lagi." }, { status: 502 })
  }
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}
