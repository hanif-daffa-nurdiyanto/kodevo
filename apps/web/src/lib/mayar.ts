export const MAYAR_WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET ?? ""
export const MAYAR_API_KEY = process.env.MAYAR_API_KEY ?? ""
export const MAYAR_MIN_PAYMENT_AMOUNT_IDR = parseInt(process.env.MAYAR_MIN_PAYMENT_AMOUNT_IDR ?? "10000")

// Static payment link URLs (legacy — used as fallback if API key not configured)
export const MAYAR_PLUS_MONTHLY_URL = process.env.MAYAR_PLUS_MONTHLY_URL ?? process.env.MAYAR_MONTHLY_URL ?? ""
export const MAYAR_PLUS_ANNUAL_URL = process.env.MAYAR_PLUS_ANNUAL_URL ?? process.env.MAYAR_ANNUAL_URL ?? ""
export const MAYAR_PRO_MONTHLY_URL = process.env.MAYAR_PRO_MONTHLY_URL ?? ""
export const MAYAR_PRO_ANNUAL_URL = process.env.MAYAR_PRO_ANNUAL_URL ?? ""

// Prices (IDR)
export const MAYAR_PLUS_MONTHLY_PRICE = parseInt(process.env.MAYAR_PLUS_MONTHLY_PRICE ?? process.env.MAYAR_MONTHLY_PRICE ?? "89000")
export const MAYAR_PLUS_ANNUAL_PRICE  = parseInt(process.env.MAYAR_PLUS_ANNUAL_PRICE  ?? process.env.MAYAR_ANNUAL_PRICE  ?? "849000")
export const MAYAR_PRO_MONTHLY_PRICE  = parseInt(process.env.MAYAR_PRO_MONTHLY_PRICE  ?? "199000")
export const MAYAR_PRO_ANNUAL_PRICE   = parseInt(process.env.MAYAR_PRO_ANNUAL_PRICE   ?? "1799000")

export type MayarTier    = "plus" | "pro"
export type MayarBilling = "monthly" | "annual"

export function getMayarUrl(tier: MayarTier, billing: MayarBilling): string {
  if (tier === "pro") return billing === "annual" ? MAYAR_PRO_ANNUAL_URL : MAYAR_PRO_MONTHLY_URL
  return billing === "annual" ? MAYAR_PLUS_ANNUAL_URL : MAYAR_PLUS_MONTHLY_URL
}

export function getMayarPrice(tier: MayarTier, billing: MayarBilling): number {
  if (tier === "pro")   return billing === "annual" ? MAYAR_PRO_ANNUAL_PRICE  : MAYAR_PRO_MONTHLY_PRICE
  return billing === "annual" ? MAYAR_PLUS_ANNUAL_PRICE : MAYAR_PLUS_MONTHLY_PRICE
}

export function getExpiryFromBilling(billing: MayarBilling): Date {
  const days = billing === "annual" ? 365 : 31
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export function detectTierFromAmount(amount: number): { tier: MayarTier; billing: MayarBilling } {
  if (amount >= MAYAR_PRO_ANNUAL_PRICE)   return { tier: "pro",  billing: "annual"  }
  if (amount >= MAYAR_PLUS_ANNUAL_PRICE)  return { tier: "plus", billing: "annual"  }
  if (amount >= MAYAR_PRO_MONTHLY_PRICE)  return { tier: "pro",  billing: "monthly" }
  return { tier: "plus", billing: "monthly" }
}

export function detectTierFromPayload(amount: number, productName?: string): { tier: MayarTier; billing: MayarBilling } {
  if (productName) {
    const slug = productName.toLowerCase()
    if (slug.includes("pro") && (slug.includes("annual") || slug.includes("tahun"))) return { tier: "pro",  billing: "annual"  }
    if (slug.includes("pro"))                                                          return { tier: "pro",  billing: "monthly" }
    if (slug.includes("plus") && (slug.includes("annual") || slug.includes("tahun"))) return { tier: "plus", billing: "annual"  }
    if (slug.includes("plus"))                                                         return { tier: "plus", billing: "monthly" }
  }
  return detectTierFromAmount(amount)
}

const MAYAR_API_BASE = "https://api.mayar.id/hl/v1"

type MayarPaymentResult = { link: string; transactionId: string }
type MayarPaymentBaseParams = {
  name: string
  email: string
  redirectUrl: string
  amount: number
  description: string
}
type MayarLegacySubscriptionParams = {
  name: string
  email: string
  userId: string
  tier: MayarTier
  billing: MayarBilling
  redirectUrl: string
  overrideAmount?: number
  promoCodeId?: string
}
type CreateMayarPaymentParams = MayarPaymentBaseParams | MayarLegacySubscriptionParams

export class MayarApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseText: string
  ) {
    super(`Mayar API error ${status}: ${responseText}`)
    this.name = "MayarApiError"
  }

  get publicMessage(): string {
    try {
      const parsed = JSON.parse(this.responseText) as {
        message?: unknown
        messages?: unknown
        error?: unknown
        errors?: unknown
        details?: unknown
      }
      const message = parsed.message ?? parsed.messages ?? parsed.error
      if (typeof message === "string" && message.trim()) return message.trim()
      if (Array.isArray(message) && message.length > 0) return message.join(", ")

      const details = parsed.errors ?? parsed.details
      if (typeof details === "string" && details.trim()) return details.trim()
      if (Array.isArray(details) && details.length > 0) return details.map(formatMayarErrorDetail).join(", ")
      if (details && typeof details === "object") return Object.entries(details)
        .map(([key, value]) => `${key}: ${formatMayarErrorDetail(value)}`)
        .join(", ")
    } catch {}

    return this.responseText.trim() || `HTTP ${this.status}`
  }
}

function formatMayarErrorDetail(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(formatMayarErrorDetail).join(", ")
  if (value && typeof value === "object") return Object.values(value).map(formatMayarErrorDetail).join(", ")
  return String(value)
}

function resolveMayarPaymentParams(params: CreateMayarPaymentParams): MayarPaymentBaseParams {
  if ("amount" in params && "description" in params) return params

  const amount = params.overrideAmount ?? getMayarPrice(params.tier, params.billing)
  const tierLabel = params.tier === "pro" ? "Pro" : "Plus"
  const billingLabel = params.billing === "annual" ? "Tahunan" : "Bulanan"
  return {
    name: params.name,
    email: params.email,
    redirectUrl: params.redirectUrl,
    amount,
    description: `Kodevo ${tierLabel} ${billingLabel} | uid:${params.userId}${params.promoCodeId ? ` | promo:${params.promoCodeId}` : ""}`,
  }
}

/**
 * Creates a dynamic, per-user payment link via Mayar API.
 * Much more reliable than static product links — email & userId are embedded
 * in the transaction, making webhook reconciliation trivial.
 */
export async function createMayarPayment(params: MayarPaymentBaseParams): Promise<MayarPaymentResult>
export async function createMayarPayment(params: MayarLegacySubscriptionParams): Promise<MayarPaymentResult>
export async function createMayarPayment(params: CreateMayarPaymentParams): Promise<MayarPaymentResult> {
  return createMayarPaymentInternal(params)
}

async function createMayarPaymentInternal(params: CreateMayarPaymentParams): Promise<MayarPaymentResult> {
  const { name, email, amount, description, redirectUrl } = resolveMayarPaymentParams(params)

  // Payment expires in 24 hours
  const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let res: Response
  try {
    res = await fetch(`${MAYAR_API_BASE}/payment/create`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAYAR_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        email,
        mobile: "08000000000",
        amount,
        redirectUrl,
        description,
        expiredAt,
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new MayarApiError(res.status, text)
  }

  const json = await res.json()
  if (!json.data?.link) throw new Error("Mayar API returned no payment link")

  return { link: json.data.link, transactionId: json.data.transactionId ?? "" }
}
