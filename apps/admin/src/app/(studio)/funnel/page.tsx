import { CreditTxType, db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import { getPaidUserIndex } from "@/lib/admin-analytics"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"

type FunnelStep = {
  label: string
  description: string
  count: number
  color: string
}

function pct(count: number, base: number) {
  return base > 0 ? Math.round((count / base) * 100) : 0
}

function fmtTime(days: number) {
  return days < 1 ? `${Math.round(days * 24)}h` : `${days.toFixed(1)}d`
}

function FunnelChart({ steps, base }: { steps: FunnelStep[]; base: number }) {
  return (
    <div className="mt-1 space-y-3">
      {steps.map((step, i) => {
        const stepPct = pct(step.count, base)
        const dropFrom = i > 0 ? steps[i - 1].count : step.count
        const dropCount = Math.max(dropFrom - step.count, 0)
        const dropPct = i > 0 && dropFrom > 0 ? Math.round((dropCount / dropFrom) * 100) : null

        return (
          <div key={step.label}>
            {dropPct !== null && (
              <div className="flex items-center gap-2 py-1 pl-4">
                <div className="h-3 w-px bg-gray-200" />
                <span className="text-[11px] font-medium text-red-500">
                  {dropPct}% drop-off ({dropCount.toLocaleString("id-ID")} users)
                </span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="w-6 shrink-0 text-right text-xs font-bold text-gray-300">{i + 1}</div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-900">{step.label}</span>
                    <span className="ml-2 text-xs text-gray-400">{step.description}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold tabular-nums text-gray-900">{step.count.toLocaleString("id-ID")}</span>
                    <span className="ml-1.5 text-xs text-gray-400">({stepPct}%)</span>
                  </div>
                </div>
                <div className="relative h-6 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-6 rounded-full ${step.color} opacity-80 transition-all duration-500`}
                    style={{ width: `${Math.max(stepPct, 0.5)}%` }}
                  />
                  {stepPct >= 8 && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                      {stepPct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default async function StudioFunnelPage() {
  await requireAdmin()

  const paidUsers = await getPaidUserIndex()

  const [
    totalUsers,
    screenedCount,
    curriculaCreatorCount,
    materialViewerCount,
    quizAttemptCount,
    passedTopicCount,
    exerciseSubmitterCount,
    bundleBuyerCount,
    topupBuyerCount,
    creditSpenderCount,
  ] = await Promise.all([
    db.user.count(),
    db.screeningResult.count(),
    db.track.groupBy({ by: ["userId"], where: { userId: { not: null } } }).then((rows) => rows.length),
    db.topicQuiz.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    db.topicQuiz.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    db.topicQuiz.groupBy({ by: ["userId"], where: { passed: true } }).then((rows) => rows.length),
    db.testSubmission.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    db.bundlePurchase.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    db.creditTransaction.groupBy({ by: ["userId"], where: { type: CreditTxType.TOPUP } }).then((rows) => rows.length),
    db.creditTransaction.groupBy({ by: ["userId"], where: { type: CreditTxType.DEBIT } }).then((rows) => rows.length),
  ])

  const [screenings, firstQuizzes, firstPurchases] = await Promise.all([
    db.screeningResult.findMany({
      take: 300,
      orderBy: { completedAt: "desc" },
      include: { user: { select: { createdAt: true } } },
    }),
    db.topicQuiz.findMany({
      orderBy: { createdAt: "asc" },
      distinct: ["userId"],
      include: { user: { select: { createdAt: true } } },
      take: 300,
    }),
    db.user.findMany({
      where: { id: { in: paidUsers.userIds } },
      take: 300,
      select: {
        createdAt: true,
        creditTransactions: {
          where: { type: CreditTxType.TOPUP },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
        bundlePurchases: {
          orderBy: { purchasedAt: "asc" },
          take: 1,
          select: { purchasedAt: true },
        },
      },
    }),
  ])

  const avgDaysToScreening = screenings.length > 0
    ? screenings.reduce((sum, screening) => {
        const diff = (screening.completedAt.getTime() - screening.user.createdAt.getTime()) / 86400000
        return sum + Math.max(0, diff)
      }, 0) / screenings.length
    : 0

  const avgDaysToFirstQuiz = firstQuizzes.length > 0
    ? firstQuizzes.reduce((sum, quiz) => {
        const diff = (quiz.createdAt.getTime() - quiz.user.createdAt.getTime()) / 86400000
        return sum + Math.max(0, diff)
      }, 0) / firstQuizzes.length
    : 0

  const purchaseDurations = firstPurchases
    .map((user) => {
      const topupAt = user.creditTransactions[0]?.createdAt ?? null
      const bundleAt = user.bundlePurchases[0]?.purchasedAt ?? null
      const firstPurchaseAt = [topupAt, bundleAt].filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0]
      return firstPurchaseAt ? Math.max(0, (firstPurchaseAt.getTime() - user.createdAt.getTime()) / 86400000) : null
    })
    .filter((value): value is number => value !== null)
  const avgDaysToFirstPurchase = purchaseDurations.length > 0
    ? purchaseDurations.reduce((sum, value) => sum + value, 0) / purchaseDurations.length
    : 0

  const engagedUserIds = new Set<string>()
  const [quizUsers, curriculumUsers, creditUsers] = await Promise.all([
    db.topicQuiz.groupBy({ by: ["userId"] }),
    db.track.groupBy({ by: ["userId"], where: { userId: { not: null } } }),
    db.creditTransaction.groupBy({ by: ["userId"], where: { type: CreditTxType.DEBIT } }),
  ])
  quizUsers.forEach((row) => engagedUserIds.add(row.userId))
  curriculumUsers.forEach((row) => row.userId && engagedUserIds.add(row.userId))
  creditUsers.forEach((row) => engagedUserIds.add(row.userId))

  const firstPurchaseCount = paidUsers.userIds.length
  const engagedLearnerCount = engagedUserIds.size
  const engagedNeverPurchased = Math.max(engagedLearnerCount - firstPurchaseCount, 0)
  const screenedNeverLearned = Math.max(screenedCount - curriculaCreatorCount, 0)
  const quizNeverPassed = Math.max(quizAttemptCount - passedTopicCount, 0)
  const learnedNeverPurchased = Math.max(engagedLearnerCount - firstPurchaseCount, 0)

  const learningSteps: FunnelStep[] = [
    { label: "Registered", description: "Total akun terdaftar", count: totalUsers, color: "bg-blue-500" },
    { label: "Completed Screening", description: "Menyelesaikan tes level awal", count: screenedCount, color: "bg-indigo-500" },
    { label: "Created Curriculum", description: "Membuat setidaknya 1 kurikulum", count: curriculaCreatorCount, color: "bg-violet-500" },
    { label: "Attempted Quiz", description: "Mengerjakan setidaknya 1 kuis topik", count: quizAttemptCount, color: "bg-purple-500" },
    { label: "Passed Topic", description: "Lulus minimal 1 topik", count: passedTopicCount, color: "bg-pink-500" },
    { label: "Submitted Exercise", description: "Submit latihan atau project", count: exerciseSubmitterCount, color: "bg-rose-500" },
  ]

  const monetizationSteps: FunnelStep[] = [
    { label: "Registered", description: "Total akun terdaftar", count: totalUsers, color: "bg-sky-500" },
    { label: "Engaged Learner", description: "Quiz, kurikulum, atau debit credit", count: engagedLearnerCount, color: "bg-cyan-500" },
    { label: "Used Paid AI", description: "Memakai credit untuk action AI", count: creditSpenderCount, color: "bg-emerald-500" },
    { label: "First Purchase", description: "Top-up credit atau beli bundle", count: firstPurchaseCount, color: "bg-amber-500" },
    { label: "Bought Bundle", description: "Punya minimal 1 bundle purchase", count: bundleBuyerCount, color: "bg-violet-500" },
  ]

  return (
    <div>
      <PageHeader
        title="Conversion Funnel"
        description="Journey belajar dan monetization berbasis credit + bundle."
      />

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Learning Funnel"
          description="Dari registrasi sampai aktivitas belajar yang bermakna."
        >
          <FunnelChart steps={learningSteps} base={totalUsers || 1} />
        </SectionCard>

        <SectionCard
          title="Monetization Funnel"
          description="Proxy first purchase dari top-up credit dan bundle purchase."
        >
          <FunnelChart steps={monetizationSteps} base={totalUsers || 1} />
        </SectionCard>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <SectionCard title="Avg. Time to Screening">
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{fmtTime(avgDaysToScreening)}</p>
          <p className="mt-1 text-xs text-gray-400">dari registrasi ke tes level</p>
        </SectionCard>

        <SectionCard title="Avg. Time to First Quiz">
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{fmtTime(avgDaysToFirstQuiz)}</p>
          <p className="mt-1 text-xs text-gray-400">dari registrasi ke kuis pertama</p>
        </SectionCard>

        <SectionCard title="First Purchase Conversion">
          <p className="mt-1 text-3xl font-bold tabular-nums text-amber-600">
            {totalUsers > 0 ? ((firstPurchaseCount / totalUsers) * 100).toFixed(2) : 0}%
          </p>
          <p className="mt-1 text-xs text-gray-400">registrasi ke top-up atau bundle</p>
          <p className="mt-2 text-[11px] text-gray-400">Rata-rata first purchase: {fmtTime(avgDaysToFirstPurchase)}</p>
        </SectionCard>
      </div>

      <SectionCard title="Analisis Drop-Off" description="Area utama yang perlu diaktifkan ulang atau diberi CTA yang lebih tepat.">
        <div className="mt-1 grid gap-4 md:grid-cols-2">
          {[
            {
              label: "Daftar tapi tidak screening",
              count: Math.max(totalUsers - screenedCount, 0),
              pct: pct(Math.max(totalUsers - screenedCount, 0), totalUsers),
              desc: "Belum tahu level mereka, friction tertinggi di awal.",
              color: "border-l-red-400",
              action: "Dorong onboarding dan reminder screening.",
            },
            {
              label: "Screening tapi tidak membuat kurikulum",
              count: screenedNeverLearned,
              pct: pct(screenedNeverLearned, screenedCount),
              desc: "Sudah tahu level, tetapi belum masuk flow belajar.",
              color: "border-l-orange-400",
              action: "Perjelas CTA mulai roadmap atau rekomendasi bundle.",
            },
            {
              label: "Coba quiz tapi belum lulus",
              count: quizNeverPassed,
              pct: pct(quizNeverPassed, quizAttemptCount),
              desc: "Ada hambatan pada pemahaman atau difficulty awal.",
              color: "border-l-yellow-400",
              action: "Tawarkan remedial material, hint, atau tutor chat.",
            },
            {
              label: "Engaged tapi belum membeli",
              count: learnedNeverPurchased,
              pct: pct(learnedNeverPurchased, engagedLearnerCount),
              desc: "User sudah belajar, tetapi belum top-up atau beli bundle.",
              color: "border-l-blue-400",
              action: "Target dengan rekomendasi bundle atau paket credit.",
            },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border border-gray-200 border-l-4 ${item.color} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold tabular-nums text-gray-900">{item.count.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-gray-400">{item.pct}% dari step</p>
                </div>
              </div>
              <p className="mt-3 border-t border-gray-100 pt-3 text-[11px] text-gray-400">{item.action}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <SectionCard title="Purchase Mix">
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{firstPurchaseCount.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-gray-400">{topupBuyerCount.toLocaleString("id-ID")} top-up buyers · {bundleBuyerCount.toLocaleString("id-ID")} bundle buyers</p>
        </SectionCard>
        <SectionCard title="Paid AI Usage">
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600">{creditSpenderCount.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-gray-400">user pernah memakai debit credit</p>
        </SectionCard>
        <SectionCard title="Engaged Never Purchased">
          <p className="mt-1 text-3xl font-bold tabular-nums text-blue-600">{engagedNeverPurchased.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-gray-400">kandidat rekomendasi bundle/top-up</p>
        </SectionCard>
      </div>
    </div>
  )
}
