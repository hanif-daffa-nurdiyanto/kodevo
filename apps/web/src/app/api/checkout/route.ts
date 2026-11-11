import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { stripe } from "@/lib/stripe"
import { type MayarTier, type MayarBilling, MAYAR_API_KEY, createMayarPayment, getMayarPrice } from "@/lib/mayar"
import { getSettings } from "@/lib/settings"
import { z } from "zod"

const schema = z.object({
  tier: z.enum(["plus", "pro"]).default("plus"),
  billing: z.enum(["monthly", "annual"]).default("monthly"),
  promoCode: z.string().optional(),
})

function getStripePriceId(tier: MayarTier, billing: MayarBilling): string {
  if (tier === "pro") {
    return billing === "annual"
      ? (process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID ?? "")
      : (process.env.STRIPE_PRO_PRICE_ID ?? "")
  }
  return billing === "annual"
    ? (process.env.STRIPE_PLUS_ANNUAL_PRICE_ID ?? process.env.STRIPE_PLUS_PRICE_ID ?? process.env.STRIPE_PRICE_ID ?? "")
    : (process.env.STRIPE_PLUS_PRICE_ID ?? process.env.STRIPE_PRICE_ID ?? "")
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, email: true, name: true, stripeCustomerId: true, isPremium: true, isPro: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, email: true, name: true, stripeCustomerId: true, isPremium: true, isPro: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  const { tier, billing, promoCode } = body.success ? body.data : { tier: "plus" as MayarTier, billing: "monthly" as MayarBilling, promoCode: undefined }

  if (tier === "pro" && dbUser.isPro) return NextResponse.json({ error: "Sudah Pro" }, { status: 400 })
  if (tier === "plus" && dbUser.isPremium && !dbUser.isPro) return NextResponse.json({ error: "Sudah Plus" }, { status: 400 })

  const settings = await getSettings([
    "payment_provider",
    "mayar_plus_monthly_url",
    "mayar_plus_annual_url",
    "mayar_pro_monthly_url",
    "mayar_pro_annual_url",
  ])
  const PROVIDER = settings.payment_provider as "stripe" | "mayar"

  if (PROVIDER === "mayar") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const redirectUrl = `${appUrl}/credits?payment=done`

    // Use Mayar API if API key is configured — creates a dynamic per-user payment link
    if (MAYAR_API_KEY) {
      // Resolve promo code → calculate discounted amount
      let promoDbId: string | undefined
      let discountedAmount: number | undefined
      if (promoCode) {
        const promo = await db.promoCode.findUnique({
          where: { code: promoCode.trim().toUpperCase() },
          include: { redemptions: { where: { userId: dbUser.id }, select: { id: true } } },
        })
        if (
          promo && promo.isActive &&
          (promo.type === "PERCENT_OFF" || promo.type === "AMOUNT_OFF") &&
          (!promo.expiresAt || promo.expiresAt > new Date()) &&
          (promo.maxUses == null || promo.usedCount < promo.maxUses) &&
          promo.redemptions.length === 0
        ) {
          promoDbId = promo.id
          const baseAmount = getMayarPrice(tier, billing)
          discountedAmount = promo.type === "PERCENT_OFF"
            ? Math.round(baseAmount * (1 - (promo.discountPercent ?? 0) / 100))
            : Math.max(0, baseAmount - (promo.discountAmount ?? 0))
        }
      }

      try {
        const { link } = await createMayarPayment({
          name: dbUser.name ?? "Pengguna Kodevo",
          email: dbUser.email ?? "",
          userId: dbUser.id,
          tier,
          billing,
          redirectUrl,
          promoCodeId: promoDbId,
          overrideAmount: discountedAmount,
        })
        return NextResponse.json({ url: link })
      } catch (err) {
        console.error("[checkout/mayar-api]", err)
        return NextResponse.json({ error: "Gagal membuat link pembayaran. Silakan coba lagi." }, { status: 502 })
      }
    }

    // Fallback: static product page URLs (legacy — for when API key not set)
    const urlMap: Record<string, string> = {
      "plus-monthly": settings.mayar_plus_monthly_url,
      "plus-annual":  settings.mayar_plus_annual_url,
      "pro-monthly":  settings.mayar_pro_monthly_url,
      "pro-annual":   settings.mayar_pro_annual_url,
    }
    const basePayUrl = urlMap[`${tier}-${billing}`] ?? ""
    if (!basePayUrl) return NextResponse.json({ error: "URL pembayaran belum dikonfigurasi." }, { status: 503 })
    const payUrl = new URL(basePayUrl)
    if (dbUser.email) payUrl.searchParams.set("email", dbUser.email)
    if (dbUser.name)  payUrl.searchParams.set("name", dbUser.name)
    payUrl.searchParams.set("ref", dbUser.id)
    payUrl.searchParams.set("return_url", redirectUrl)
    return NextResponse.json({ url: payUrl.toString() })
  }

  // ── Stripe ────────────────────────────────────────────────────────────────
  let customerId = dbUser.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email ?? undefined,
      name: dbUser.name ?? undefined,
      metadata: { userId: dbUser.id },
    })
    customerId = customer.id
    await db.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId: customerId } })
  }

  const priceId = getStripePriceId(tier, billing)
  if (!priceId) return NextResponse.json({ error: "Harga belum dikonfigurasi." }, { status: 503 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Resolve promo code → Stripe coupon
  let stripeCouponId: string | undefined
  let promoDbId: string | undefined
  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.trim().toUpperCase() },
      include: { redemptions: { where: { userId: dbUser.id }, select: { id: true } } },
    })
    if (
      promo && promo.isActive &&
      (promo.type === "PERCENT_OFF" || promo.type === "AMOUNT_OFF") &&
      (!promo.expiresAt || promo.expiresAt > new Date()) &&
      (promo.maxUses == null || promo.usedCount < promo.maxUses) &&
      promo.redemptions.length === 0
    ) {
      promoDbId = promo.id
      // Reuse cached Stripe coupon or create new one
      if (promo.stripeCouponId) {
        stripeCouponId = promo.stripeCouponId
      } else {
        const coupon = await stripe.coupons.create(
          promo.type === "PERCENT_OFF"
            ? { percent_off: promo.discountPercent!, duration: "once", name: promo.code }
            : { amount_off: promo.discountAmount!, currency: "idr", duration: "once", name: promo.code }
        )
        stripeCouponId = coupon.id
        await db.promoCode.update({ where: { id: promo.id }, data: { stripeCouponId: coupon.id } })
      }
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/credits?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/credits`,
    metadata: { userId: dbUser.id, tier, promoCodeId: promoDbId ?? "" },
    subscription_data: { metadata: { userId: dbUser.id, tier } },
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
  })

  return NextResponse.json({ url: checkoutSession.url })
}
