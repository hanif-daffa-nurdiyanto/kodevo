import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { computeCurrentStreak } from "@/lib/rate-limit"
import { sendStreakReminderEmail } from "@kodevo/email"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Users who have at least 1 streak day but haven't logged activity today
  const users = await db.user.findMany({
    where: {
      streaks: {
        some: {},
        none: { date: today },
      },
    },
    include: {
      streaks: { select: { date: true }, orderBy: { date: "desc" }, take: 120 },
    },
  })

  let sent = 0
  for (const user of users) {
    const streak = computeCurrentStreak(user.streaks.map((s) => s.date))
    if (streak === 0) continue
    await sendStreakReminderEmail(user.email, user.name ?? "Kamu", streak)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
