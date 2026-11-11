import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, email: true, name: true, stripeCustomerId: true, isPremium: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, email: true, name: true, stripeCustomerId: true, isPremium: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (dbUser.isPremium) {
    return NextResponse.json({ error: "Sudah Premium" }, { status: 400 })
  }

  // Reuse existing Stripe customer or create new one
  let customerId = dbUser.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email ?? undefined,
      name: dbUser.name ?? undefined,
      metadata: { userId: dbUser.id },
    })
    customerId = customer.id
    await db.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${baseUrl}/credits?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/credits`,
    metadata: { userId: dbUser.id },
    subscription_data: {
      metadata: { userId: dbUser.id },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
