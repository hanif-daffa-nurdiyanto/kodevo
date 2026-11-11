import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { computeCurrentStreak } from "@/lib/rate-limit"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, xp: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, xp: true } })
    : null

  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const streaks = await db.streak.findMany({
    where: { userId: dbUser.id },
    orderBy: { date: "desc" },
    take: 60,
    select: { date: true },
  })
  const streak = computeCurrentStreak(streaks.map((s) => new Date(s.date)))

  return NextResponse.json({ xp: dbUser.xp, streak })
}
