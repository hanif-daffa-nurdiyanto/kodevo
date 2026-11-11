import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { TutorChat } from "@/components/tutor-chat"
import { computeCurrentStreak } from "@/lib/rate-limit"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, name: true, email: true, image: true, level: true, isPremium: true, isPro: true, xp: true, username: true },
      })
    : sessionUser.email
    ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, name: true, email: true, image: true, level: true, isPremium: true, isPro: true, xp: true, username: true },
      })
    : null

  if (!dbUser) redirect("/login")

  const streaks = await db.streak.findMany({
    where: { userId: dbUser.id },
    orderBy: { date: "desc" },
    take: 60,
    select: { date: true },
  })
  const currentStreak = computeCurrentStreak(streaks.map((s) => new Date(s.date)))

  return (
    <div className="min-h-screen bg-background md:flex">
      <DashboardNav user={{ ...dbUser, streak: currentStreak }} />
      <main className="flex-1 md:h-screen md:overflow-y-auto">{children}</main>
      <TutorChat isPremium={dbUser.isPremium || dbUser.isPro} level={dbUser.level} />
    </div>
  )
}
