import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { checkAIRateLimit } from "@/lib/rate-limit"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, isPremium: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, isPremium: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await checkAIRateLimit(dbUser.id, dbUser.isPremium)

  return NextResponse.json({
    isPremium: dbUser.isPremium,
    allowed: result.allowed,
    dailyRemaining: result.dailyRemaining,
    weeklyRemaining: result.weeklyRemaining,
    dailyLimit: result.dailyLimit,
    weeklyLimit: result.weeklyLimit,
    limitedBy: result.limitedBy,
    resetAt: result.resetAt,
  })
}
