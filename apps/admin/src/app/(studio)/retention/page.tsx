import { db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"
import { Users, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@kodevo/utils"

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export default async function StudioRetentionPage() {
  await requireAdmin()

  const now = new Date()
  const currentWeekMonday = getWeekMonday(now)

  // Go back 12 cohort weeks
  const cohortStart = new Date(currentWeekMonday)
  cohortStart.setDate(cohortStart.getDate() - 12 * 7)

  const users = await db.user.findMany({
    where: { createdAt: { gte: cohortStart } },
    select: { id: true, createdAt: true },
  })

  const userIds = users.map((u) => u.id)

  const allStreaks = await db.streak.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, date: true },
  })

  const RET_WEEKS = [0, 1, 2, 4, 8]

  const cohorts: {
    label: string
    weekStart: Date
    total: number
    retention: (number | null)[]
  }[] = []

  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(cohortStart)
    weekStart.setDate(weekStart.getDate() + w * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const cohortUsers = users.filter((u) => {
      const c = new Date(u.createdAt)
      return c >= weekStart && c < weekEnd
    })
    if (cohortUsers.length === 0) continue

    const cohortUserIds = new Set(cohortUsers.map((u) => u.id))

    const retention = RET_WEEKS.map((rw) => {
      const retStart = new Date(weekStart)
      retStart.setDate(retStart.getDate() + rw * 7)
      const retEnd = new Date(retStart)
      retEnd.setDate(retEnd.getDate() + 7)

      if (retStart >= now) return null

      const active = new Set(
        allStreaks
          .filter((s) => {
            const d = new Date(s.date)
            d.setHours(0, 0, 0, 0)
            return cohortUserIds.has(s.userId) && d >= retStart && d < retEnd
          })
          .map((s) => s.userId)
      ).size

      return cohortUsers.length > 0 ? Math.round((active / cohortUsers.length) * 100) : 0
    })

    const weekLabel = weekStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
    const weekEndLabel = new Date(weekEnd.getTime() - 86400000).toLocaleDateString("id-ID", {
      day: "numeric", month: "short",
    })

    cohorts.push({
      label: `${weekLabel} – ${weekEndLabel}`,
      weekStart,
      total: cohortUsers.length,
      retention,
    })
  }

  // Compute avg retention per week (across cohorts that have data for that week)
  const avgRetention = RET_WEEKS.map((_, i) => {
    const validCohorts = cohorts.filter((c) => c.retention[i] !== null)
    if (validCohorts.length === 0) return null
    return Math.round(validCohorts.reduce((sum, c) => sum + (c.retention[i] ?? 0), 0) / validCohorts.length)
  })

  function retColor(pct: number | null): string {
    if (pct === null) return "bg-gray-50 text-gray-300"
    if (pct >= 50) return "bg-emerald-50 text-emerald-700"
    if (pct >= 30) return "bg-blue-50 text-blue-700"
    if (pct >= 15) return "bg-amber-50 text-amber-700"
    if (pct >= 5) return "bg-orange-50 text-orange-700"
    return "bg-red-50 text-red-600"
  }

  const week1Avg = avgRetention[1]
  const week4Avg = avgRetention[3]
  const totalCohortUsers = cohorts.reduce((s, c) => s + c.total, 0)

  return (
    <div>
      <PageHeader
        title="Cohort Retention"
        description="Berapa % user yang kembali aktif di minggu-minggu setelah signup"
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Cohort Users (12 wk)"
          value={totalCohortUsers.toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Avg Week-1 Retention"
          value={week1Avg !== null ? `${week1Avg}%` : "—"}
          sub={week1Avg !== null ? (week1Avg >= 30 ? "healthy" : "needs improvement") : "insufficient data"}
          icon={week1Avg !== null && week1Avg >= 30 ? TrendingUp : TrendingDown}
          trend={week1Avg !== null && week1Avg >= 30 ? "up" : "down"}
          iconColor={week1Avg !== null && week1Avg >= 30 ? "text-emerald-600" : "text-red-500"}
          iconBg={week1Avg !== null && week1Avg >= 30 ? "bg-emerald-50" : "bg-red-50"}
        />
        <StatCard
          label="Avg Week-4 Retention"
          value={week4Avg !== null ? `${week4Avg}%` : "—"}
          sub={week4Avg !== null ? (week4Avg >= 15 ? "healthy" : "churn risk") : "insufficient data"}
          icon={week4Avg !== null && week4Avg >= 15 ? TrendingUp : TrendingDown}
          trend={week4Avg !== null && week4Avg >= 15 ? "up" : "down"}
          iconColor={week4Avg !== null && week4Avg >= 15 ? "text-emerald-600" : "text-red-500"}
          iconBg={week4Avg !== null && week4Avg >= 15 ? "bg-emerald-50" : "bg-red-50"}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-4">Benchmark SaaS</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Wk 1 (good)</span><span className="font-medium text-gray-700">≥ 30%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Wk 2 (good)</span><span className="font-medium text-gray-700">≥ 20%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Wk 4 (good)</span><span className="font-medium text-gray-700">≥ 15%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Wk 8 (good)</span><span className="font-medium text-gray-700">≥ 10%</span></div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Cohort Retention Table"
        description="Baris = minggu signup · Kolom = aktivitas N minggu setelah signup · Angka = % user aktif (ada streak)"
        className="mb-5"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-1">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 w-36 whitespace-nowrap">
                  Cohort (signup)
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-14">Users</th>
                {RET_WEEKS.map((w) => (
                  <th key={w} className="text-center py-2 px-2 text-xs font-semibold text-gray-500 w-16">
                    Wk {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohorts.map((c) => (
                <tr key={c.label}>
                  <td className="py-2 pr-4 text-xs font-medium text-gray-700 whitespace-nowrap">{c.label}</td>
                  <td className="py-2 px-2 text-center text-xs text-gray-400 tabular-nums">{c.total}</td>
                  {c.retention.map((pct, i) => (
                    <td key={i} className="py-2 px-1 text-center">
                      <span
                        className={cn(
                          "inline-block w-full rounded-md py-1 text-xs font-semibold tabular-nums",
                          retColor(pct)
                        )}
                      >
                        {pct === null ? "—" : `${pct}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {/* Average row */}
              {cohorts.length > 0 && (
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 text-xs font-bold text-gray-900">Average</td>
                  <td className="py-2 px-2 text-center text-xs text-gray-500 tabular-nums">
                    {Math.round(totalCohortUsers / Math.max(cohorts.length, 1))}
                  </td>
                  {avgRetention.map((pct, i) => (
                    <td key={i} className="py-2 px-1 text-center">
                      <span
                        className={cn(
                          "inline-block w-full rounded-md py-1 text-xs font-bold tabular-nums",
                          retColor(pct)
                        )}
                      >
                        {pct === null ? "—" : `${pct}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {cohorts.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Belum ada data cukup (butuh user signup di 12 minggu terakhir)
          </p>
        )}
      </SectionCard>

      <SectionCard title="Cara Baca Tabel" noPadding={false}>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-semibold text-gray-900 mb-1">Wk 0 (Activation)</p>
            <p className="text-gray-500">% user yang aktif (ada streak) di minggu pertama mereka daftar. Idealnya &gt; 50% — ini menunjukkan product activation berhasil.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Wk 1–4 (Early Retention)</p>
            <p className="text-gray-500">User yang kembali aktif di minggu-minggu awal. Kalau drop dari Wk0 ke Wk1 sangat tajam (&gt;60%), berarti ada masalah di onboarding / aha-moment.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Wk 8 (Long-term)</p>
            <p className="text-gray-500">User yang masih aktif 2 bulan setelah daftar. Ini proxy untuk LTV tinggi dan kandidat bundle/top-up terbaik.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          {[
            { color: "bg-emerald-50 text-emerald-700", label: "≥ 50% — Excellent" },
            { color: "bg-blue-50 text-blue-700", label: "30–49% — Good" },
            { color: "bg-amber-50 text-amber-700", label: "15–29% — Average" },
            { color: "bg-orange-50 text-orange-700", label: "5–14% — Below avg" },
            { color: "bg-red-50 text-red-600", label: "< 5% — At risk" },
            { color: "bg-gray-50 text-gray-300", label: "— = belum ada data" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={cn("text-xs px-2 py-0.5 rounded font-medium", item.color)}>{item.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
