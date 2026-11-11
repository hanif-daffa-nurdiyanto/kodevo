import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"
import { MAYAR_API_KEY, MAYAR_MIN_PAYMENT_AMOUNT_IDR, MayarApiError, createMayarPayment } from "@/lib/mayar"
import { getPromoQuote, promoDescriptionTags, PromoValidationError, recordPromoRedemptionInTx } from "@/lib/promos"
import { z } from "zod"

const schema = z.object({
  promoCode: z.string().trim().min(1).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { trackId } = await params
  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, name: true, email: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, name: true, email: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const track = await db.track.findUnique({
    where: { id: trackId },
    select: { id: true, slug: true, title: true, type: true, isFree: true, priceIdr: true, publishedAt: true },
  })
  if (!track || track.type !== TrackType.BUNDLE || !track.publishedAt) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 })
  }
  if (track.isFree) {
    return NextResponse.json({ url: `/learn/${track.slug}`, trackId: track.id, amount: 0 })
  }
  if (!track.priceIdr || track.priceIdr <= 0) {
    return NextResponse.json({ error: "Harga bundle belum dikonfigurasi." }, { status: 503 })
  }
  const bundlePrice = track.priceIdr

  const existingPurchase = await db.bundlePurchase.findUnique({
    where: { userId_trackId: { userId: dbUser.id, trackId: track.id } },
    select: { id: true },
  })
  if (existingPurchase) return NextResponse.json({ error: "Bundle sudah dibeli." }, { status: 400 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  let promoQuote = null
  try {
    promoQuote = await getPromoQuote({
      userId: dbUser.id,
      code: body.data.promoCode,
      target: "BUNDLE",
      refId: track.id,
      originalAmountIdr: bundlePrice,
    })
  } catch (error) {
    if (error instanceof PromoValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const finalAmount = promoQuote?.finalAmountIdr ?? bundlePrice

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const redirectUrl = `${appUrl}/learn/${track.slug}?payment=done`

  if (finalAmount <= 0 && promoQuote) {
    const transactionId = `promo_free:bundle:${promoQuote.promoCodeId}:${dbUser.id}:${track.id}`
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.bundlePurchase.findFirst({
        where: {
          OR: [
            { userId: dbUser.id, trackId: track.id },
            { mayarTransactionId: transactionId },
          ],
        },
        select: { id: true },
      })
      if (existing) return { alreadyProcessed: true }

      await tx.bundlePurchase.create({
        data: {
          userId: dbUser.id,
          trackId: track.id,
          amountPaidIdr: 0,
          mayarTransactionId: transactionId,
        },
      })

      const promoRecorded = await recordPromoRedemptionInTx({
        tx,
        promoCodeId: promoQuote.promoCodeId,
        userId: dbUser.id,
        target: "BUNDLE",
        refId: track.id,
        transactionId,
        originalAmountIdr: bundlePrice,
        discountAmountIdr: promoQuote.discountAmountIdr,
        finalAmountIdr: promoQuote.finalAmountIdr,
      })

      return { alreadyProcessed: false, promoRecorded }
    })

    return NextResponse.json({
      url: redirectUrl,
      freeCheckout: true,
      trackId: track.id,
      amount: 0,
      originalAmountIdr: bundlePrice,
      discountAmountIdr: promoQuote.discountAmountIdr,
      promoCode: promoQuote.code,
      ...result,
    })
  }

  if (!MAYAR_API_KEY) return NextResponse.json({ error: "Mayar API belum dikonfigurasi." }, { status: 503 })
  if (finalAmount < MAYAR_MIN_PAYMENT_AMOUNT_IDR) {
    return NextResponse.json(
      {
        error: `Harga bundle minimal ${formatRupiah(MAYAR_MIN_PAYMENT_AMOUNT_IDR)} untuk checkout Mayar.`,
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
      description: `Kodevo Bundle | uid:${dbUser.id} | type:bundle | trackId:${track.id}${promoDescriptionTags(promoQuote)}`,
    })
    return NextResponse.json({
      url: link,
      trackId: track.id,
      amount: finalAmount,
      originalAmountIdr: track.priceIdr,
      discountAmountIdr: promoQuote?.discountAmountIdr ?? 0,
      promoCode: promoQuote?.code ?? null,
    })
  } catch (error) {
    console.error("[bundles/checkout]", error)
    if (error instanceof MayarApiError) {
      return NextResponse.json({ error: `Mayar menolak checkout: ${error.publicMessage}` }, { status: 502 })
    }
    return NextResponse.json({ error: "Gagal membuat link pembayaran bundle. Silakan coba lagi." }, { status: 502 })
  }
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}
