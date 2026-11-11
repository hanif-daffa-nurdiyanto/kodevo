import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"
import { ProfileSection } from "./profile-section"
import { SettingsTabs } from "./settings-tabs"
import { computeCurrentStreak } from "@/lib/rate-limit"
import Link from "next/link"
import { GitBranch, ChevronRight } from "lucide-react"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; payment?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const userId = sessionUser.id
  if (!userId) redirect("/login")

  const params = await searchParams
  if (params.tab === "billing" || params.tab === "premium" || params.payment) {
    const qs = params.payment ? `?payment=${encodeURIComponent(params.payment)}` : ""
    redirect(`/credits${qs}`)
  }

  const [dbUser, passedQuizzes, streaks] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        isPremium: true,
        isPro: true,
        premiumExpiresAt: true,
        proExpiresAt: true,
        stripeCustomerId: true,
        level: true,
        xp: true,
        username: true,
        isProfilePublic: true,
        learningStyle: true,
        guidancePreference: true,
        githubUsername: true,
        githubAccessToken: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        domisili: true,
        pendidikan: true,
        createdAt: true,
      },
    }),
    db.topicQuiz.count({ where: { userId, passed: true } }),
    db.streak.findMany({ where: { userId }, select: { date: true }, orderBy: { date: "desc" } }),
  ])

  if (!dbUser) redirect("/login")

  const streak = computeCurrentStreak(streaks.map((s) => s.date))
  const hasPassword = !!dbUser.password

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 md:px-6">
      <div>
        <h1 className="text-[28px] font-extrabold leading-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola profil dan koneksi akunmu.</p>
      </div>

      <SettingsTabs
        profile={
          <ProfileSection
            id={dbUser.id}
            name={dbUser.name}
            email={dbUser.email}
            image={dbUser.image}
            level={dbUser.level}
            xp={dbUser.xp}
            streak={streak}
            passedTopics={passedQuizzes}
            username={dbUser.username}
            isProfilePublic={dbUser.isProfilePublic}
            learningStyle={dbUser.learningStyle}
            guidancePreference={dbUser.guidancePreference}
            githubUsername={dbUser.githubUsername}
            phone={dbUser.phone}
            dateOfBirth={dbUser.dateOfBirth}
            gender={dbUser.gender}
            domisili={dbUser.domisili}
            pendidikan={dbUser.pendidikan}
            joinedAt={dbUser.createdAt}
            hasPassword={hasPassword}
          />
        }
        github={
          <Link
            href="/settings/github"
            className="flex max-w-[520px] items-center justify-between gap-4 rounded-xl border border-[#F3F4F6] bg-white p-6 text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#1A1A2E] text-white">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">GitHub</div>
                <div className="text-xs text-muted-foreground">
                  {dbUser.githubAccessToken ? "Terhubung" : "Belum terhubung"} · Auto-submit coding exercise dan AI Code Review
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        }
      />
    </div>
  )
}
