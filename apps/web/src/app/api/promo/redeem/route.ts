import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { sendPremiumWelcomeEmail } from "@kodevo/email"

// FREE_PLUS / FREE_PRO — grant tier access directly (no Stripe)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const userId = sessionUser.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await req.json()
  if (!code || typeof code !== "string") return NextResponse.json({ error: "Kode tidak valid" }, { status: 400 })

  const [dbUser, promo] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    db.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { redemptions: { where: { userId }, select: { id: true } } },
    }),
  ])

  if (!promo || !promo.isActive) return NextResponse.json({ error: "Kode promo tidak ditemukan atau tidak aktif" }, { status: 404 })
  if (promo.expiresAt && promo.expiresAt < new Date()) return NextResponse.json({ error: "Kode promo sudah kadaluarsa" }, { status: 400 })
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return NextResponse.json({ error: "Kode promo sudah habis" }, { status: 400 })
  if (promo.redemptions.length > 0) return NextResponse.json({ error: "Kamu sudah pernah menggunakan kode ini" }, { status: 400 })
  if (promo.type !== "FREE_PLUS" && promo.type !== "FREE_PRO") {
    return NextResponse.json({ error: "Kode ini adalah kode diskon, gunakan saat checkout" }, { status: 400 })
  }

  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        isPro: promo.type === "FREE_PRO",
        premiumExpiresAt: expiresAt,
        proExpiresAt: promo.type === "FREE_PRO" ? expiresAt : undefined,
      },
    }),
    db.promoRedemption.create({
      data: { promoCodeId: promo.id, userId },
    }),
    db.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    }),
  ])

  if (dbUser?.email) {
    sendPremiumWelcomeEmail(dbUser.email, dbUser.name ?? "Kamu").catch(() => {})
  }

  return NextResponse.json({
    success: true,
    tier: promo.type === "FREE_PRO" ? "pro" : "plus",
  })
}
