import { db } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { getPaidUserIndex, getRevenueSummary } from "@/lib/admin-analytics"
import {
  Users, Coins, Zap, BookOpen, Brain, TrendingUp,
  CheckCircle2, UserPlus, Percent, AlertTriangle, XCircle, Clock, ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@kodevo/utils"
import { StatCard } from "./_components/stat-card"
import { PageHeader } from "./_components/page-header"
import { SectionCard } from "./_components/section-card"
import { MiniBarChart } from "./_components/mini-bar"

function StatusDot({ status }: { status: "green" | "amber" | "red" | "gray" }) {
  return (
    <span className={cn(
      "inline-block h-2 w-2 rounded-full shrink-0",
      status === "green" && "bg-emerald-500",
      status === "amber" && "bg-amber-400",
      status === "red" && "bg-red-500",
      status === "gray" && "bg-gray-300",
    )} />
  )
}

function OpsCard({
  title, href, status, primary, primaryLabel, subs, children, className,
}: {
  title: string
  href: string
  status: "green" | "amber" | "red" | "gray"
  primary: string | number
  primaryLabel: string
  subs?: { label: string; value: string | number; color?: string }[]
  children?: React.ReactNode
  className?: string
}) {
  const borderColor = {
    green: "border-l-emerald-400",
    amber: "border-l-amber-400",
    red: "border-l-red-400",
    gray: "border-l-gray-200",
  }[status]

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 border-l-4 p-5", borderColor, className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        </div>
        <Link href={href} className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
          Detail <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{primary}</p>
        <p className="text-xs text-gray-400 mt-1">{primaryLabel}</p>
      </div>
      {subs && subs.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {subs.map((s) => (
            <div key={s.label}>
              <p className={cn("text-sm font-semibold tabular-nums", s.color ?? "text-gray-700")}>{s.value}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

function fmtRp(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}rb`
  return `Rp${value.toLocaleString("id-ID")}`
}

export default async function StudioOverviewPage() {
  await requireAdmin()

  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0)
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14); fourteenDaysAgo.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    paidUserIndex,
    revenueThisMonth,
    newUsersToday,
    newUsersThisWeek,
    activeTodayCount,
    activeThisWeekCount,
    totalCurricula,
    topicsCompletedTotal,
    topicsCompletedToday,
    aiRequestsToday,
    aiRequestsThisWeek,
    userGrowth,
    materialStats,
    totalTopics,
    screenedCount,
    quizAttemptorCount,
    pendingQuizCount,
    usersSignedUpLastWeek,
    usersReturnedThisWeek,
  ] = await Promise.all([
    db.user.count(),
    getPaidUserIndex(),
    getRevenueSummary({ from: monthStart }),
    db.user.count({ where: { createdAt: { gte: today } } }),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.streak.groupBy({ by: ["userId"], where: { date: today } }).then((r) => r.length),
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: sevenDaysAgo } } }).then((r) => r.length),
    db.track.count({ where: { userId: { not: null } } }),
    db.topicQuiz.count({ where: { passed: true } }),
    db.topicQuiz.count({ where: { passed: true, createdAt: { gte: today } } }),
    db.aIUsage.aggregate({ where: { date: today }, _sum: { count: true } }).then((r) => r._sum.count ?? 0),
    db.aIUsage.aggregate({ where: { date: { gte: sevenDaysAgo } }, _sum: { count: true } }).then((r) => r._sum.count ?? 0),
    db.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    db.generatedMaterial.aggregate({ _sum: { hitCount: true }, _count: { id: true } }),
    db.topic.count(),
    db.screeningResult.count(),
    db.topicQuiz.groupBy({ by: ["userId"] }).then((r) => r.length),
    db.topicQuiz.count({ where: { submittedAt: null, passed: false } }),
    db.user.findMany({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }, select: { id: true } }),
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: sevenDaysAgo } } }).then((r) => new Set(r.map((x) => x.userId))),
  ])

  // Derived values
  const paidUsers = paidUserIndex.userIds.length
  const paidConversionRate = ((paidUsers / Math.max(totalUsers, 1)) * 100).toFixed(1)
  const paidAtRiskCount = paidUsers > 0
    ? await db.user.count({
        where: {
          id: { in: paidUserIndex.userIds },
          streaks: { none: { date: { gte: fourteenDaysAgo } } },
        },
      })
    : 0
  const screeningRate = totalUsers > 0 ? Math.round((screenedCount / totalUsers) * 100) : 0
  const week1RetentionPct = usersSignedUpLastWeek.length > 0
    ? Math.round((usersSignedUpLastWeek.filter((u) => usersReturnedThisWeek.has(u.id)).length / usersSignedUpLastWeek.length) * 100)
    : null
  const totalMaterials = materialStats._count.id
  const totalHits = materialStats._sum.hitCount ?? 0
  const cacheSaved = Math.max(0, totalHits - totalMaterials)
  const cacheHitPct = totalHits > 0 ? Math.round((cacheSaved / totalHits) * 100) : 0
  const estCostToday = aiRequestsToday * 0.00014
  const estCostWeek = aiRequestsThisWeek * 0.00014
  const revenueThisMonthIdr = revenueThisMonth.estimatedTotalRevenueIdr
  const revenuePerPaidUser = paidUsers > 0 ? Math.round(revenueThisMonthIdr / paidUsers) : 0
  const aiDisabled = process.env.AI_DISABLED === "true"
  const aiProviderName = process.env.ANTHROPIC_API_KEY?.trim()
    ? "Anthropic"
    : process.env.GROQ_API_KEY?.trim()
    ? "Groq"
    : "Not configured"
  const aiConfigured = aiProviderName !== "Not configured"

  // Bar chart data
  const days: { label: string; date: Date; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const count = userGrowth.filter((u) => {
      const c = new Date(u.createdAt); c.setHours(0, 0, 0, 0)
      return c >= d && c < next
    }).length
    days.push({ label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), date: d, count })
  }

  // Alerts
  const alerts: { level: "error" | "warn"; msg: string }[] = []
  if (aiDisabled) alerts.push({ level: "error", msg: "AI sedang dimatikan (AI_DISABLED=true) — semua fitur AI tidak berfungsi" })
  if (!aiDisabled && !aiConfigured) alerts.push({ level: "error", msg: "AI provider belum dikonfigurasi — isi ANTHROPIC_API_KEY atau GROQ_API_KEY" })
  if (paidAtRiskCount > 0) alerts.push({ level: "warn", msg: `${paidAtRiskCount} paid learner tidak aktif 14+ hari — perlu follow-up` })

  // Status thresholds
  const revenueStatus: "green" | "amber" | "red" | "gray" = revenueThisMonthIdr > 0 ? "green" : paidUsers > 0 ? "amber" : "gray"
  const engagementStatus: "green" | "amber" | "red" = activeTodayCount > 0 ? "green" : activeThisWeekCount > 0 ? "amber" : "red"
  const aiStatus: "green" | "amber" | "red" = aiDisabled || !aiConfigured ? "red" : estCostToday > 1 ? "amber" : "green"
  const cacheStatus: "green" | "amber" | "gray" = cacheHitPct > 50 ? "green" : cacheHitPct > 0 ? "amber" : "gray"
  const atRiskStatus: "green" | "amber" | "red" | "gray" = paidAtRiskCount > 2 ? "red" : paidAtRiskCount > 0 ? "amber" : "green"
  const systemStatus: "green" | "amber" | "red" | "gray" = aiDisabled || !aiConfigured ? "red" : "green"

  return (
    <div>
      <PageHeader title="Overview" description="Platform metrics & kondisi operasional" />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium",
              a.level === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-700",
            )}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Users" value={fmtNumber(totalUsers)} sub={`+${newUsersToday} hari ini`} icon={Users} trend="up" iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="Paid Learners" value={fmtNumber(paidUsers)} sub={`${paidConversionRate}% paid conversion`} icon={Coins} trend="up" iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard label="Revenue Bulan Ini" value={fmtRp(revenueThisMonthIdr)} sub={`${fmtNumber(revenueThisMonth.topupCount + revenueThisMonth.bundlePurchaseCount)} transaksi`} icon={TrendingUp} trend="up" iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Aktif Hari Ini" value={fmtNumber(activeTodayCount)} sub={`${fmtNumber(activeThisWeekCount)} aktif minggu ini`} icon={Zap} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard label="Total Kurikulum" value={fmtNumber(totalCurricula)} sub="dibuat oleh user" icon={BookOpen} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard label="AI Requests Hari Ini" value={fmtNumber(aiRequestsToday)} sub={`est. $${estCostToday.toFixed(4)} (${aiProviderName})`} icon={Brain} iconColor="text-sky-600" iconBg="bg-sky-50" />
      </div>

      {/* Registrasi chart + mini stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <SectionCard title="Registrasi User" description={`30 hari terakhir · +${newUsersThisWeek} user minggu ini`}>
            <MiniBarChart data={days} color="bg-blue-500" height={100} startLabel={days[0]?.label} midLabel={days[14]?.label} endLabel={days[29]?.label} />
          </SectionCard>
        </div>
        <div className="flex flex-col gap-4">
          <StatCard label="Topik Diselesaikan" value={fmtNumber(topicsCompletedTotal)} sub={`+${topicsCompletedToday} hari ini`} icon={CheckCircle2} trend={topicsCompletedToday > 0 ? "up" : "neutral"} iconColor="text-emerald-600" iconBg="bg-emerald-50" className="flex-1" />
          <StatCard label="New Users (7 hari)" value={`+${fmtNumber(newUsersThisWeek)}`} sub={`+${newUsersToday} hari ini`} icon={UserPlus} trend={newUsersThisWeek > 0 ? "up" : "neutral"} iconColor="text-blue-600" iconBg="bg-blue-50" className="flex-1" />
          <StatCard label="Konversi Paid" value={`${paidConversionRate}%`} sub={`${paidUsers} dari ${totalUsers} user`} icon={Percent} iconColor="text-amber-600" iconBg="bg-amber-50" className="flex-1" />
        </div>
      </div>

      {/* Operational cards */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Kondisi Operasional</p>
      <div className="grid grid-cols-2 gap-4">
        <OpsCard
          title="Revenue"
          href="/finance"
          status={revenueStatus}
          primary={fmtRp(revenueThisMonthIdr)}
          primaryLabel="credit top-up + bundle bulan ini"
          subs={[
            { label: "credit top-up", value: fmtRp(revenueThisMonth.estimatedTopupRevenueIdr) },
            { label: "bundle revenue", value: fmtRp(revenueThisMonth.bundleRevenueIdr) },
            { label: "paid learners", value: fmtNumber(paidUsers) },
            { label: "avg revenue/user", value: fmtRp(revenuePerPaidUser) },
          ]}
        />

        <OpsCard
          title="Engagement"
          href="/engagement"
          status={engagementStatus}
          primary={activeTodayCount}
          primaryLabel="user aktif hari ini (ada streak)"
          subs={[
            { label: "aktif minggu ini", value: activeThisWeekCount },
            { label: "week-1 retention", value: week1RetentionPct !== null ? `${week1RetentionPct}%` : "—", color: week1RetentionPct !== null ? (week1RetentionPct >= 30 ? "text-emerald-600" : week1RetentionPct >= 15 ? "text-amber-600" : "text-red-500") : "text-gray-400" },
            { label: "topik lulus hari ini", value: topicsCompletedToday },
            { label: "total topik lulus", value: fmtNumber(topicsCompletedTotal) },
          ]}
        />

        <OpsCard
          title="AI Usage & Cost"
          href="/"
          status={aiStatus}
          primary={aiRequestsToday}
          primaryLabel="AI request hari ini"
          subs={[
            { label: "req minggu ini", value: fmtNumber(aiRequestsThisWeek) },
            { label: "est. cost hari ini", value: `$${estCostToday.toFixed(4)}` },
            { label: "est. cost minggu ini", value: `$${estCostWeek.toFixed(3)}` },
            { label: "est. bulanan (30d)", value: `$${(estCostToday * 30).toFixed(2)}` },
          ]}
        >
          {aiDisabled && <p className="text-[10px] text-red-600 mt-3 pt-3 border-t border-gray-100 font-medium">⛔ AI_DISABLED=true — semua AI route return 503</p>}
        </OpsCard>

        <OpsCard
          title="Material Cache"
          href="/content"
          status={cacheStatus}
          primary={`${cacheHitPct}%`}
          primaryLabel="cache hit rate (AI calls saved)"
          subs={[
            { label: "unique materials", value: fmtNumber(totalMaterials) },
            { label: "total served", value: fmtNumber(totalHits) },
            { label: "AI calls dihemat", value: fmtNumber(cacheSaved), color: "text-emerald-600" },
            { label: "topik tersedia", value: fmtNumber(totalTopics) },
          ]}
        />

        <OpsCard
          title="Conversion Funnel"
          href="/funnel"
          status={screeningRate > 20 ? "green" : screeningRate > 0 ? "amber" : "gray"}
          primary={`${paidConversionRate}%`}
          primaryLabel="registrasi → paid learner"
          subs={[
            { label: "sudah screening", value: fmtNumber(screenedCount) },
            { label: "screening rate", value: `${screeningRate}%`, color: screeningRate > 20 ? "text-emerald-600" : "text-amber-600" },
            { label: "punya kurikulum", value: fmtNumber(totalCurricula) },
            { label: "pernah quiz", value: fmtNumber(quizAttemptorCount) },
          ]}
        />

        <OpsCard
          title="At-Risk Users"
          href="/at-risk"
          status={atRiskStatus}
          primary={paidAtRiskCount}
          primaryLabel="paid learner tidak aktif 14+ hari"
          subs={[
            { label: "perlu perhatian", value: paidAtRiskCount > 0 ? "⚠ Ya" : "✓ Aman", color: paidAtRiskCount > 0 ? "text-red-500" : "text-emerald-600" },
            { label: "quiz pending", value: fmtNumber(pendingQuizCount) },
            { label: "total paid", value: fmtNumber(paidUsers) },
            { label: "at-risk %", value: paidUsers > 0 ? `${Math.round((paidAtRiskCount / paidUsers) * 100)}%` : "—", color: paidAtRiskCount / Math.max(paidUsers, 1) > 0.1 ? "text-red-500" : "text-gray-700" },
          ]}
        />

        <OpsCard
          title="System Status"
          href="/"
          status={systemStatus}
          primary={`${[!aiDisabled && aiConfigured, true, true].filter(Boolean).length}/3`}
          primaryLabel="layanan berjalan normal"
          className="col-span-2"
        >
          <div className="mt-1">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "AI Provider", ok: !aiDisabled && aiConfigured, detail: aiDisabled ? "DISABLED via env" : aiProviderName },
                { label: "Database (Supabase)", ok: true, detail: "Connected" },
                { label: "Payments", ok: true, detail: "Credit + Bundle" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={cn("flex items-center gap-1 font-medium", item.ok ? "text-emerald-600" : "text-red-500")}>
                    {item.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {item.detail}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="h-3 w-3" />
              Last checked: just now
            </div>
          </div>
        </OpsCard>
      </div>
    </div>
  )
}
