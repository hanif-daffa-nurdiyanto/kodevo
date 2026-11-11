import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { getPromoQuote, normalizePromoTarget, PromoValidationError, resolvePromoScope } from "@/lib/promos"
import { z } from "zod"

const schema = z.object({
  code: z.string().trim().min(1),
  target: z.string().trim().min(1),
  refId: z.string().trim().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "Kode promo tidak valid" }, { status: 400 })

  const target = normalizePromoTarget(body.data.target)
  if (!target) return NextResponse.json({ error: "Target promo tidak valid" }, { status: 400 })

  try {
    const scope = await resolvePromoScope(target, body.data.refId)
    const quote = await getPromoQuote({
      userId: dbUser.id,
      code: body.data.code,
      target: scope.target,
      refId: scope.refId,
      originalAmountIdr: scope.originalAmountIdr,
    })
    if (!quote) return NextResponse.json({ error: "Kode promo tidak valid" }, { status: 400 })

    return NextResponse.json({
      valid: true,
      code: quote.code,
      type: quote.type,
      description: quote.description,
      originalAmountIdr: quote.originalAmountIdr,
      discountAmountIdr: quote.discountAmountIdr,
      finalAmountIdr: quote.finalAmountIdr,
    })
  } catch (error) {
    if (error instanceof PromoValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
