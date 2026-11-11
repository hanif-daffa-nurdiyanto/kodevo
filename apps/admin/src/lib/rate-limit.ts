import { db } from "@kodevo/db"

export const FREE_DAILY_LIMIT    = 20
export const FREE_WEEKLY_LIMIT   = 100
export const PREMIUM_DAILY_LIMIT = 100
export const PREMIUM_WEEKLY_LIMIT = 500

export const PREMIUM_CURRICULUM_DAILY_LIMIT = 5

export async function checkCurriculumDailyLimit(userId: string): Promise<{ allowed: boolean }> {
  const today = getToday()
  const count = await db.track.count({
    where: { userId, createdAt: { gte: today } },
  })
  return { allowed: count < PREMIUM_CURRICULUM_DAILY_LIMIT }
}

// Credit cost per action
export const CREDIT_COST = {
  MATERIAL:   3,
  QUIZ:       2,
  EXERCISE:   2,
  PROJECT:    3,
  CURRICULUM: 5,
  CHAT:       1,
} as const

function getToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon ...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setDate(d.getDate() - diff)
  return d
}

function getNextMonday(): Date {
  const d = getWeekStart()
  d.setDate(d.getDate() + 7)
  return d
}

export type RateLimitResult = {
  allowed: boolean
  dailyRemaining: number
  weeklyRemaining: number
  dailyLimit: number
  weeklyLimit: number
  limitedBy: "daily" | "weekly" | null
  resetAt: Date | null // when the blocking limit resets
}

export async function checkAIRateLimit(
  userId: string,
  isPremium: boolean
): Promise<RateLimitResult> {
  const dailyLimit  = isPremium ? PREMIUM_DAILY_LIMIT  : FREE_DAILY_LIMIT
  const weeklyLimit = isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_WEEKLY_LIMIT

  const today     = getToday()
  const weekStart = getWeekStart()

  const [todayRow, weekRows] = await Promise.all([
    db.aIUsage.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.aIUsage.findMany({ where: { userId, date: { gte: weekStart } } }),
  ])

  const dailyUsed  = todayRow?.count ?? 0
  const weeklyUsed = weekRows.reduce((sum, r) => sum + r.count, 0)

  const dailyRemaining  = Math.max(0, dailyLimit - dailyUsed)
  const weeklyRemaining = Math.max(0, weeklyLimit - weeklyUsed)

  const dailyBlocked  = dailyUsed >= dailyLimit
  const weeklyBlocked = weeklyUsed >= weeklyLimit
  const allowed = !dailyBlocked && !weeklyBlocked

  let limitedBy: "daily" | "weekly" | null = null
  let resetAt: Date | null = null

  if (dailyBlocked) {
    limitedBy = "daily"
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    resetAt = tomorrow
  } else if (weeklyBlocked) {
    limitedBy = "weekly"
    resetAt = getNextMonday()
  }

  return { allowed, dailyRemaining, weeklyRemaining, dailyLimit, weeklyLimit, limitedBy, resetAt }
}

export async function incrementAIUsage(userId: string, cost = 1): Promise<void> {
  const today = getToday()
  await db.aIUsage.upsert({
    where: { userId_date: { userId, date: today } },
    update: { count: { increment: cost } },
    create: { userId, date: today, count: cost },
  })
}

export async function recordStreak(userId: string): Promise<void> {
  const today = getToday()
  await db.streak.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, date: today },
  })
}

export function computeCurrentStreak(dates: Date[]): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime())
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i])
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === i) streak++
    else break
  }
  return streak
}
