import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@kodevo/db"
import { sendPremiumWelcomeEmail, sendPremiumExpiredEmail } from "@kodevo/email"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const tier = (session.metadata?.tier ?? "plus") as "plus" | "pro"
      const subscriptionId = session.subscription as string
      if (userId && subscriptionId) {
        const data =
          tier === "pro"
            ? { isPremium: true, isPro: true, stripeSubscriptionId: subscriptionId }
            : { isPremium: true, stripeSubscriptionId: subscriptionId }
        const updated = await db.user.update({
          where: { id: userId },
          data,
          select: { email: true, name: true },
        })
        if (updated.email) sendPremiumWelcomeEmail(updated.email, updated.name ?? "Kamu").catch(() => {})

        // Record promo code redemption if one was used
        const promoCodeId = session.metadata?.promoCodeId
        if (promoCodeId) {
          await db.$transaction([
            db.promoRedemption.upsert({
              where: { promoCodeId_userId: { promoCodeId, userId } },
              create: { promoCodeId, userId },
              update: {},
            }),
            db.promoCode.update({
              where: { id: promoCodeId },
              data: { usedCount: { increment: 1 } },
            }),
          ]).catch(() => {})
        }
      }
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      const tier = (sub.metadata?.tier ?? "plus") as "plus" | "pro"
      if (!userId) break
      const isActive = sub.status === "active" || sub.status === "trialing"
      const data =
        tier === "pro"
          ? { isPremium: isActive, isPro: isActive }
          : { isPremium: isActive }
      await db.user.update({ where: { id: userId }, data })
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      const tier = (sub.metadata?.tier ?? "plus") as "plus" | "pro"
      if (!userId) break
      const data =
        tier === "pro"
          ? { isPremium: false, isPro: false, stripeSubscriptionId: null }
          : { isPremium: false, stripeSubscriptionId: null }
      const updated = await db.user.update({
        where: { id: userId },
        data,
        select: { email: true, name: true },
      })
      if (updated.email) sendPremiumExpiredEmail(updated.email, updated.name ?? "Kamu").catch(() => {})
      break
    }
  }

  return NextResponse.json({ received: true })
}
