import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { computeCurrentStreak } from "@/lib/rate-limit"
import { sendWeeklyProgressEmail } from "@kodevo/email"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0)

  const users = await db.user.findMany({
    where: {
      streaks: { some: { date: { gte: weekAgo } } },
    },
    include: {
      streaks: { select: { date: true }, orderBy: { date: "desc" }, take: 120 },
      topicQuizzes: {
        where: { passed: true, createdAt: { gte: weekAgo } },
        select: { id: true },
      },
    },
  })

  let sent = 0
  for (const user of users) {
    const streakDates = user.streaks.map((s) => s.date)
    const activeDays = streakDates.filter((d) => {
      const date = new Date(d); date.setHours(0, 0, 0, 0)
      return date >= weekAgo
    }).length

    await sendWeeklyProgressEmail(user.email, user.name ?? "Kamu", {
      activeDays,
      topicsCompleted: user.topicQuizzes.length,
      xpGained: user.topicQuizzes.length * 100,
      currentStreak: computeCurrentStreak(streakDates),
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
