import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { applyCreditTransaction, db, InsufficientCreditError } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  amount: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0, "amount tidak boleh 0"),
  reason: z.string().min(3).max(120),
})

export async function POST(req: NextRequest) {
  await requireAdmin()

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { userId, email, amount, reason } = parsed.data
  if (!userId && !email) {
    return NextResponse.json({ error: "userId atau email diperlukan" }, { status: 400 })
  }

  const user = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    : await db.user.findUnique({ where: { email: email!.toLowerCase() }, select: { id: true, email: true, name: true } })

  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

  try {
    const transaction = await applyCreditTransaction({
      userId: user.id,
      type: amount > 0 ? "ADJUSTMENT" : "DEBIT",
      amount: Math.abs(amount),
      action: `ADMIN_CREDIT_ADJUSTMENT:${reason}`,
      refId: `admin-adjustment:${Date.now()}:${user.id}`,
    })

    return NextResponse.json({
      ok: true,
      user,
      amount,
      balanceAfter: transaction.balanceAfter,
    })
  } catch (error) {
    if (error instanceof InsufficientCreditError) {
      return NextResponse.json(
        { error: "Saldo user tidak cukup untuk adjustment negatif.", balance: error.balance, required: error.required },
        { status: 402 }
      )
    }
    throw error
  }
}
