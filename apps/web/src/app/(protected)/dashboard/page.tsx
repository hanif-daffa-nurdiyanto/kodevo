import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { AIUsageCounter } from "@/components/ai-usage-counter"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { Progress } from "@kodevo/ui/progress"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"
import { computeCurrentStreak } from "@/lib/rate-limit"
import { cn } from "@kodevo/utils"
import { RecommendedBundleCards } from "./recommended-bundle-cards"

const levelConfig: Record<string, { label: string; emoji: string }> = {
  BEGINNER: { label: "Explorer", emoji: "🌱" },
  MID: { label: "Builder", emoji: "🔨" },
  ADVANCE: { label: "Creator", emoji: "🚀" },
}

async function getDashboardData(userId: string) {
  const activeTrackWhere = {
    OR: [
      { userId },
      {
        AND: [
          { type: TrackType.BUNDLE },
          { publishedAt: { not: null } },
          { modules: { some: { enrollments: { some: { userId } } } } },
          { OR: [{ isFree: true }, { purchases: { some: { userId } } }] },
        ],
      },
    ],
  }

  const [curricula, testSubmissions, streaks] = await Promise.all([
    db.track.findMany({
      where: activeTrackWhere,
      orderBy: { id: "desc" },
      include: {
        modules: { orderBy: { order: "asc" }, include: { topics: { select: { id: true } } } },
      },
    }),
    db.testSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { exercise: { include: { topic: true } } },
    }),
    db.streak.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 60, select: { date: true } }),
  ])

  const activeBundleIds = curricula.filter((track) => track.type === TrackType.BUNDLE).map((track) => track.id)
  const recommendedBundles = await db.track.findMany({
    where: {
      type: TrackType.BUNDLE,
      publishedAt: { not: null },
      ...(activeBundleIds.length > 0 ? { id: { notIn: activeBundleIds } } : {}),
    },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      icon: true,
      title: true,
      description: true,
      isFree: true,
      priceIdr: true,
      modules: { select: { id: true } },
      purchases: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
  })

  const currentStreak = computeCurrentStreak(streaks.map((s) => new Date(s.date)))

  const passedQuizzes = await db.topicQuiz.findMany({
    where: { userId, passed: true },
    select: { topicId: true },
  })
  const passedTopics = new Set(passedQuizzes.map((q) => q.topicId))

  const curriculumProgress = curricula.map((track) => {
    const totalTopics = track.modules.reduce((sum, mod) => sum + mod.topics.length, 0)
    const passedCount = track.modules.reduce(
      (sum, mod) => sum + mod.topics.filter((topic) => passedTopics.has(topic.id)).length,
      0
    )

    return {
      id: track.id,
      slug: track.slug,
      title: track.title,
      icon: track.icon,
      type: track.type,
      isFree: track.isFree,
      totalTopics,
      passedCount,
      pct: totalTopics > 0 ? Math.round((passedCount / totalTopics) * 100) : 0,
      moduleLabel: `${track.modules.filter((mod) => mod.topics.some((topic) => passedTopics.has(topic.id))).length || 1} dari ${track.modules.length || 1} modul`,
    }
  }).filter((track) => track.totalTopics === 0 || track.passedCount < track.totalTopics)

  const totalPassed = passedTopics.size
  const totalTopics = curricula.reduce(
    (sum, track) => sum + track.modules.reduce((moduleSum, mod) => moduleSum + mod.topics.length, 0),
    0
  )

  const lastQuiz = await db.topicQuiz.findFirst({
    where: { userId, passed: false },
    orderBy: { createdAt: "desc" },
    include: {
      topic: {
        include: {
          module: { include: { track: { select: { slug: true, title: true, icon: true } } } },
        },
      },
    },
  })

  const resumeTopic = lastQuiz
    ? {
      topicId: lastQuiz.topicId,
      topicTitle: lastQuiz.topic.title,
      moduleId: lastQuiz.topic.moduleId,
      trackSlug: lastQuiz.topic.module.track?.slug ?? "",
      trackTitle: lastQuiz.topic.module.track?.title ?? "",
    }
    : null

  return {
    curriculumProgress,
    testSubmissions,
    currentStreak,
    totalPassed,
    totalTopics,
    resumeTopic,
    recommendedBundles: recommendedBundles.map((bundle, index) => ({
      id: bundle.id,
      slug: bundle.slug,
      icon: bundle.icon ?? "📚",
      cover: index % 2 === 0 ? "bg-[#F0FDF4]" : "bg-[#EFF6FF]",
      title: bundle.title,
      description: bundle.description,
      modules: bundle.modules.length,
      isFree: bundle.isFree,
      priceIdr: bundle.priceIdr,
      purchased: bundle.purchases.length > 0,
    })),
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, level: true, xp: true, learningStyle: true, guidancePreference: true },
    })
    : sessionUser.email
      ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, name: true, level: true, xp: true, learningStyle: true, guidancePreference: true },
      })
      : null
  if (!dbUser) redirect("/login")

  const { curriculumProgress, testSubmissions, currentStreak, totalPassed, totalTopics, resumeTopic, recommendedBundles } =
    await getDashboardData(dbUser.id)

  const level = levelConfig[dbUser.level] ?? { label: dbUser.level, emoji: "📚" }
  const overallPct = totalTopics > 0 ? Math.round((totalPassed / totalTopics) * 100) : 0
  const isNewUser = curriculumProgress.length === 0

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 md:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">
            Halo, {dbUser.name?.split(" ")[0] ?? "Kamu"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Semangat lanjutin belajarmu hari ini.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-[#FEF3C7] px-4 py-2 text-sm font-bold text-[#D97706]">
            🔥 {currentStreak} hari streak
          </div>
          <div className="rounded-full bg-[#F0FDF4] px-4 py-2 text-sm font-bold text-kodevo-green">
            ⚡ {dbUser.xp.toLocaleString()} XP
          </div>
          <AIUsageCounter className="h-9 rounded-full bg-[#EFF6FF] px-4 text-primary" />
        </div>
      </div>

      <div className="kodevo-gradient relative mb-10 overflow-hidden rounded-2xl px-8 py-7 text-white">
        <div className="absolute -top-10 right-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/85">
              {isNewUser ? "Mulai belajar" : "Lanjutkan belajar"}
            </p>
            <h2 className="text-[22px] font-extrabold">
              {resumeTopic?.topicTitle ?? `${level.emoji} Level ${level.label}`}
            </h2>
            <p className="mt-1.5 text-[13px] text-white/90">
              {resumeTopic
                ? `${resumeTopic.trackTitle} · ${overallPct}% selesai`
                : "Ceritakan tujuanmu, AI generate roadmap yang dipersonalisasi khusus untukmu."}
            </p>
          </div>
          <Link
            href={resumeTopic ? `/learn/${resumeTopic.trackSlug}/${resumeTopic.moduleId}/${resumeTopic.topicId}` : "/learn/new"}
            className="relative inline-flex h-[46px] shrink-0 items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-[#00A88A] transition-transform hover:-translate-y-0.5"
          >
            {resumeTopic ? "Lanjut Materi" : "Buat Roadmap"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Track aktif</h2>
        <Link href="/learn?tab=active" className="text-[13px] font-bold text-primary hover:text-kodevo-green">Lihat semua →</Link>
      </div>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {curriculumProgress.length === 0 ? (
          <Card className="border-dashed md:col-span-2">
            <CardContent className="p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold">Belum ada track aktif</p>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">Ceritakan tujuanmu, AI akan merancang roadmap pertama.</p>
              <Link href="/learn/new" className={buttonVariants({ size: "sm" })}>Mulai belajar</Link>
            </CardContent>
          </Card>
        ) : (
          curriculumProgress.map((curriculum) => (
            <Link key={curriculum.id} href={`/learn/${curriculum.slug}`} className="block rounded-xl border border-muted bg-white p-5 text-inherit transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0FDF4] text-base">
                  {curriculum.icon ?? "📚"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{curriculum.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {curriculum.type === TrackType.BUNDLE ? (curriculum.isFree ? "Bundle Gratis" : "Bundle Dibeli") : `Level ${level.label}`}
                  </p>
                </div>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="kodevo-gradient h-full rounded-full" style={{ width: `${curriculum.pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{curriculum.moduleLabel}</span>
                <span className="font-bold text-foreground">{curriculum.pct}%</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Rekomendasi buat kamu</h2>
        <Link href="/learn?filter=bundle" className="text-[13px] font-bold text-primary hover:text-kodevo-green">Lihat semua bundle →</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {recommendedBundles.length > 0 ? (
          <RecommendedBundleCards bundles={recommendedBundles} />
        ) : (
          <Card className="border-dashed md:col-span-3">
            <CardContent className="p-8 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold">Bundle belum tersedia</p>
              <p className="mt-1 text-xs text-muted-foreground">Cek lagi nanti untuk rekomendasi bundle belajar.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {testSubmissions.length > 0 && (
        <Card className="mt-10">
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-bold">Test Terbaru</h2>
            <div className="space-y-2">
              {testSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", (sub.score ?? 0) >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                    {sub.score ?? 0}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{sub.exercise.topic.title}</p>
                    <p className="text-xs text-muted-foreground">{sub.passed ? "Lulus" : "Belum lulus"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
