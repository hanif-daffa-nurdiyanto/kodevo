import Stripe from "stripe"

let _stripe: Stripe | null = null
function getInstance(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop: string) => (getInstance() as unknown as Record<string, unknown>)[prop],
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
