import { NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { sendPremiumExpiredEmail } from "@kodevo/email"

export async function GET(req: Request) {
  const authHeader = new Headers(req.headers).get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Expire Plus users (Mayar — Stripe users have null premiumExpiresAt)
  const expiredPlus = await db.user.findMany({
    where: {
      isPremium: true,
      isPro: false,
      premiumExpiresAt: { lt: now },
      NOT: { premiumExpiresAt: null },
    },
    select: { id: true, email: true, name: true },
  })

  // Expire Pro users (Mayar — Stripe users have null proExpiresAt)
  const expiredPro = await db.user.findMany({
    where: {
      isPro: true,
      proExpiresAt: { lt: now },
      NOT: { proExpiresAt: null },
    },
    select: { id: true, email: true, name: true },
  })

  const allExpired = [...expiredPlus, ...expiredPro]
  if (allExpired.length === 0) return NextResponse.json({ expired: 0 })

  if (expiredPlus.length > 0) {
    await db.user.updateMany({
      where: { id: { in: expiredPlus.map((u) => u.id) } },
      data: { isPremium: false, premiumExpiresAt: null },
    })
  }

  if (expiredPro.length > 0) {
    await db.user.updateMany({
      where: { id: { in: expiredPro.map((u) => u.id) } },
      data: { isPremium: false, isPro: false, proExpiresAt: null },
    })
  }

  for (const user of allExpired) {
    if (user.email) {
      sendPremiumExpiredEmail(user.email, user.name ?? "Kamu").catch(() => {})
    }
  }

  return NextResponse.json({ expired: allExpired.length, plus: expiredPlus.length, pro: expiredPro.length })
}
