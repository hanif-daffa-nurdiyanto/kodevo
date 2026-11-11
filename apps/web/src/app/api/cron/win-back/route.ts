import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { sendWinBackEmail } from "@kodevo/email"

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0)
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14); fourteenDaysAgo.setHours(0, 0, 0, 0)

  // Users inactive 7-14 days (had activity before, but not recently — avoid repeat spam)
  const users = await db.user.findMany({
    where: {
      streaks: {
        some: { date: { lt: sevenDaysAgo, gte: fourteenDaysAgo } },
        none: { date: { gte: sevenDaysAgo } },
      },
    },
    include: {
      streaks: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
    },
  })

  let sent = 0
  for (const user of users) {
    const lastDate = user.streaks[0]?.date
    if (!lastDate) continue
    const daysMissed = Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000)
    await sendWinBackEmail(user.email, user.name ?? "Kamu", daysMissed)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
