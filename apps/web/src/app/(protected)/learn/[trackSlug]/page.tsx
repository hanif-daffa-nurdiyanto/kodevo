import { auth } from "@kodevo/auth"
import { db, getTrackModuleAccessMap, TrackType } from "@kodevo/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { Badge } from "@kodevo/ui/badge"
import { Progress } from "@kodevo/ui/progress"
import { ChevronLeft, CheckCircle2, ArrowRight, Lock, Target, Sparkles, Trophy } from "lucide-react"
import { cn } from "@kodevo/utils"
import { BundleCheckoutButton } from "./bundle-checkout-button"

const levelConfig: Record<string, { label: string; emoji: string; startFrom: string[] }> = {
  BEGINNER: { label: "Beginner", emoji: "🌱", startFrom: ["BEGINNER"] },
  MID:      { label: "Intermediate", emoji: "⚡", startFrom: ["MID", "ADVANCE"] },
  ADVANCE:  { label: "Advanced", emoji: "🔥", startFrom: ["ADVANCE"] },
}

function getRecommendedModuleIndex(totalModules: number, level: string): number {
  if (totalModules <= 0) return -1
  const rawIndex =
    level === "ADVANCE"
      ? Math.floor(totalModules * 0.67)
      : level === "MID"
      ? Math.floor(totalModules * 0.33)
      : 0

  return Math.min(totalModules - 1, Math.max(0, rawIndex))
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackSlug: string }>
  searchParams: Promise<{ skip?: string }>
}) {
  const { trackSlug } = await params
  const { skip } = await searchParams

  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) redirect("/login")

  const track = await db.track.findUnique({
    where: { slug: trackSlug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { topics: { select: { id: true } } },
      },
    },
  })
  if (!track) notFound()
  if (track.type === TrackType.BUNDLE && !track.publishedAt) notFound()
  const isBundle = track.type === TrackType.BUNDLE

  // User curricula are private to their creator
  const isUserCurriculum = track.userId !== null
  if (isUserCurriculum && track.userId !== dbUser.id) notFound()
  const purchasedBundle = isBundle && !track.isFree
    ? await db.bundlePurchase.findUnique({
        where: { userId_trackId: { userId: dbUser.id, trackId: track.id } },
        select: { id: true },
      })
    : null
  const canStartBundle = !isBundle || track.isFree || !!purchasedBundle

  // Check track assessment (skipped for user-generated curricula)
  const assessment = isUserCurriculum || !canStartBundle
    ? null
    : await db.trackAssessment.findUnique({
        where: { userId_trackId: { userId: dbUser.id, trackId: track.id } },
      })

  if (!isUserCurriculum && !isBundle && canStartBundle && !assessment && !skip) {
    redirect(`/learn/${trackSlug}/screening`)
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId: dbUser.id, moduleId: { in: track.modules.map((m) => m.id) } },
    select: { moduleId: true, status: true },
  })
  const enrollmentMap = new Map(enrollments.map((e) => [e.moduleId, e.status]))

  const passedQuizzes = await db.topicQuiz.findMany({
    where: {
      userId: dbUser.id,
      passed: true,
      topic: { moduleId: { in: track.modules.map((m) => m.id) } },
    },
    select: { topicId: true },
  })
  const passedTopicIds = new Set(passedQuizzes.map((q) => q.topicId))
  const passedByModule = new Map<string, number>()
  for (const mod of track.modules) {
    const count = mod.topics.filter((t) => passedTopicIds.has(t.id)).length
    if (count > 0) passedByModule.set(mod.id, count)
  }

  // Module assessment gate: check which modules have passed assessments
  const passedAssessments = await db.moduleAssessmentAttempt.findMany({
    where: {
      userId: dbUser.id,
      passed: true,
      assessment: { moduleId: { in: track.modules.map((m) => m.id) } },
    },
    select: { assessment: { select: { moduleId: true } } },
  })
  const assessmentPassedModuleIds = new Set(passedAssessments.map((a) => a.assessment.moduleId))
  const moduleAccessMap = await getTrackModuleAccessMap({
    userId: dbUser.id,
    trackId: track.id,
    modules: track.modules.map((mod) => ({ id: mod.id, isFree: mod.isFree })),
  })

  // Determine recommended starting module based on assessment level
  const userLevel = assessment?.level ?? "BEGINNER"
  const levelInfo = levelConfig[userLevel]

  // Find first module that matches the recommended level and is not yet completed
  // Modules have a `level` concept via their order — we use a simple heuristic:
  // first 1/3 = BEGINNER, middle 1/3 = MID, last 1/3 = ADVANCE
  const total = track.modules.length
  const recommendedModuleIndex = getRecommendedModuleIndex(total, userLevel)
  const recommendedModule = recommendedModuleIndex >= 0 ? track.modules[recommendedModuleIndex] : null
  const isSequenceUnlocked = (moduleIndex: number) => {
    if (moduleIndex === 0) return true
    if (assessment && moduleIndex <= recommendedModuleIndex) return true

    const prevMod = track.modules[moduleIndex - 1]
    return prevMod ? assessmentPassedModuleIds.has(prevMod.id) : true
  }

  const totalTopics = track.modules.reduce((sum, mod) => sum + mod.topics.length, 0)
  const passedTopics = Array.from(passedByModule.values()).reduce((sum, count) => sum + count, 0)
  const overallProgress = totalTopics > 0 ? Math.round((passedTopics / totalTopics) * 100) : 0
  const recommendedAvailableModule = assessment && recommendedModule && moduleAccessMap.get(recommendedModule.id)
    ? recommendedModule
    : null
  const firstAvailableModule = recommendedAvailableModule ?? (canStartBundle
    ? track.modules.find((mod, modIndex) => {
        const isAccessLocked = !moduleAccessMap.get(mod.id)
        const isGateLocked = !isSequenceUnlocked(modIndex)
        return !isAccessLocked && !isGateLocked
      })
    : null)
  const hasStarted = enrollments.length > 0 || passedTopics > 0 || passedAssessments.length > 0
  const primaryLearningHref = assessment || isUserCurriculum || isBundle || skip
    ? firstAvailableModule
      ? `/learn/${trackSlug}/${firstAvailableModule.id}`
      : null
    : `/learn/${trackSlug}/screening`
  const primaryLearningLabel = isBundle && track.isFree && !hasStarted ? "Mulai Belajar" : "Lanjut Belajar"

  return (
    <div className="mx-auto max-w-[880px] px-4 py-10 md:px-6">
      <Link href="/learn" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" />
        Semua Track
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#F0FDF4] text-2xl">
            {track.icon ?? "📚"}
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{track.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <Badge variant={userLevel === "ADVANCE" ? "creator" : userLevel === "MID" ? "builder" : "explorer"}>
                {levelInfo.emoji} {levelInfo.label}
              </Badge>
              <span className="text-[13px] text-muted-foreground">{track.modules.length} modul · Project-based</span>
            </div>
          </div>
        </div>
        {!canStartBundle && isBundle ? (
          <BundleCheckoutButton
            trackId={track.id}
            title={track.title}
            description={track.description}
            priceIdr={track.priceIdr}
            moduleCount={track.modules.length}
            disabled={!track.priceIdr || track.priceIdr <= 0}
          />
        ) : primaryLearningHref ? (
          <Link href={primaryLearningHref} className={cn(buttonVariants(), "h-[46px] shrink-0 px-6")}>
            {primaryLearningLabel}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <p className="mb-7 max-w-[620px] text-[15px] leading-7 text-muted-foreground">{track.description}</p>

      <div className="mb-9 rounded-xl border border-muted bg-[#FAFBFC] px-6 py-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-bold">Progress keseluruhan</span>
          <span className="text-[13px] font-bold text-[#00A88A]">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} />
      </div>

      {assessment && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-lg">{levelInfo.emoji}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Level kamu di track ini: <span className="text-primary">{levelInfo.label}</span></p>
              <p className="mt-0.5 text-xs text-muted-foreground">{recommendedModule ? `Disarankan mulai dari "${recommendedModule.title}"` : "Mulai dari modul pertama"}</p>
            </div>
            <Badge variant="outline" className="shrink-0 border-primary/30 text-xs text-primary">
              <Target className="mr-1 h-3 w-3" />
              Direkomendasikan
            </Badge>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 text-base font-bold">Daftar Modul</h2>
      <div className="space-y-3">
        {track.modules.map((mod, modIndex) => {
          const isAccessLocked = !canStartBundle || !moduleAccessMap.get(mod.id)
          const topicCount = mod.topics.length
          const passedCount = passedByModule.get(mod.id) ?? 0
          const isDone = passedCount >= topicCount && topicCount > 0
          const enrollStatus = enrollmentMap.get(mod.id) ?? null
          const isRecommended = assessment && recommendedModule?.id === mod.id && !isDone

          // Screening unlocks the recommended module and previous modules from sequence gates.
          // Paid/free access remains controlled by moduleAccessMap and credit checks inside content actions.
          const isGateLocked = !isSequenceUnlocked(modIndex)
          const isLocked = isAccessLocked || isGateLocked
          const shouldStartWithScreening = !isBundle && !isUserCurriculum && !hasStarted && !assessment && !skip && modIndex === 0
          const moduleActionHref = shouldStartWithScreening
            ? `/learn/${trackSlug}/screening`
            : isDone && !assessmentPassedModuleIds.has(mod.id)
            ? `/learn/${trackSlug}/${mod.id}/assessment`
            : `/learn/${trackSlug}/${mod.id}`

          return (
            <Card key={mod.id} className={cn("transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]", isLocked && "opacity-60", isRecommended && !isLocked && "border-2 border-kodevo-green bg-[#F0FDF4]")}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold",
                        isDone && assessmentPassedModuleIds.has(mod.id)
                          ? "kodevo-gradient text-white"
                          : isLocked
                          ? "bg-muted text-muted-foreground"
                          : isRecommended
                          ? "kodevo-gradient text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {isDone && assessmentPassedModuleIds.has(mod.id) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        mod.order
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className={cn("text-[15px] font-bold", isLocked && "text-muted-foreground")}>
                          {mod.title}
                        </p>
                        {assessmentPassedModuleIds.has(mod.id) && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                            Selesai
                          </Badge>
                        )}
                        {isDone && !assessmentPassedModuleIds.has(mod.id) && !isLocked && (
                          <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                            Assessment Diperlukan
                          </Badge>
                        )}
                        {isRecommended && !isLocked && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            <Sparkles className="mr-1 h-2.5 w-2.5" />
                            Mulai di sini
                          </Badge>
                        )}
                        {isGateLocked && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <Lock className="mr-1 h-2.5 w-2.5" />
                            Selesaikan modul sebelumnya
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{topicCount} topik{mod.description ? ` · ${mod.description}` : ""}</p>
                      {topicCount > 0 && !isLocked && (
                        <div className="mt-2 flex items-center gap-2">
                          <Progress
                            value={topicCount > 0 ? (passedCount / topicCount) * 100 : 0}
                            className="h-1 flex-1 max-w-[120px]"
                          />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {passedCount}/{topicCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAccessLocked ? (
                    isBundle ? (
                      <div className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none shrink-0 opacity-60")}>
                        <Lock className="mr-1 h-3.5 w-3.5" />
                        Terkunci
                      </div>
                    ) : (
                      <Link href="/credits" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
                        <Lock className="mr-1 h-3.5 w-3.5" />
                        Top-up Credit
                      </Link>
                    )
                  ) : isGateLocked ? null : (
                    <Link
                      href={moduleActionHref}
                      className={cn(
                        buttonVariants({ size: "sm", variant: isRecommended ? "default" : "outline" }),
                        "shrink-0"
                      )}
                    >
                      {assessmentPassedModuleIds.has(mod.id)
                        ? "Review"
                        : isDone
                        ? "Assessment"
                        : enrollStatus
                        ? "Lanjut"
                        : "Mulai"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Track completion CTA */}
      {track.modules.length > 0 && track.modules.every((m) => assessmentPassedModuleIds.has(m.id)) && (
        <div className="mt-6">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-5 flex items-center gap-4">
              <Trophy className="h-9 w-9 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-700">Track Selesai! 🎉</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Kamu telah menyelesaikan semua modul dan assessment. Lihat bukti belajarmu.
                </p>
              </div>
              <Link
                href={`/learn/${trackSlug}/complete`}
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "shrink-0 bg-emerald-600 hover:bg-emerald-700")}
              >
                Lihat Completion
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
