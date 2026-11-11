import { db } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { computeCurrentStreak } from "@/lib/rate-limit"
import { Users, Flame, Zap, Brain, TrendingUp } from "lucide-react"
import { cn } from "@kodevo/utils"
import { StatCard } from "../_components/stat-card"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { MiniBarChart } from "../_components/mini-bar"

export default async function StudioEngagementPage() {
  await requireAdmin()

  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    dauData,
    levelDist,
    learnStyleDist,
    guidanceDist,
    topUsers,
    aiUsageData,
    totalUsers,
    activeThisMonth,
  ] = await Promise.all([
    db.streak.groupBy({
      by: ["date"],
      _count: { userId: true },
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    }),
    db.user.groupBy({ by: ["level"], _count: { level: true } }),
    db.user.groupBy({
      by: ["learningStyle"],
      _count: { learningStyle: true },
      where: { learningStyle: { not: null } },
    }),
    db.user.groupBy({
      by: ["guidancePreference"],
      _count: { guidancePreference: true },
      where: { guidancePreference: { not: null } },
    }),
    db.user.findMany({
      orderBy: { xp: "desc" },
      take: 10,
      include: {
        streaks: { orderBy: { date: "desc" }, take: 90, select: { date: true } },
        _count: { select: { topicQuizzes: true } },
      },
    }),
    db.aIUsage.groupBy({
      by: ["date"],
      _sum: { count: true },
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    }),
    db.user.count(),
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: thirtyDaysAgo } } }).then((r) => r.length),
  ])

  const dau = dauData.find((d) => {
    const dd = new Date(d.date); dd.setHours(0, 0, 0, 0)
    return dd.getTime() === today.getTime()
  })?._count.userId ?? 0

  const wau = dauData
    .filter((d) => { const dd = new Date(d.date); dd.setHours(0, 0, 0, 0); return dd >= sevenDaysAgo })
    .reduce((acc, d) => acc + d._count.userId, 0)

  const buildDays = (dataFn: (d: Date) => number) => {
    const result: { label: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      result.push({ label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), count: dataFn(d) })
    }
    return result
  }

  const days = buildDays((d) => {
    const match = dauData.find((r) => { const rd = new Date(r.date); rd.setHours(0, 0, 0, 0); return rd.getTime() === d.getTime() })
    return match?._count.userId ?? 0
  })

  const aiDays = buildDays((d) => {
    const match = aiUsageData.find((r) => { const rd = new Date(r.date); rd.setHours(0, 0, 0, 0); return rd.getTime() === d.getTime() })
    return match?._sum.count ?? 0
  })

  const LEVEL_LABEL: Record<string, string> = {
    UNSCREENED: "Unscreened", BEGINNER: "Beginner", MID: "Mid", ADVANCE: "Advanced",
  }
  const LEVEL_COLOR: Record<string, string> = {
    UNSCREENED: "bg-gray-300", BEGINNER: "bg-emerald-500", MID: "bg-blue-500", ADVANCE: "bg-violet-500",
  }
  const totalLevels = levelDist.reduce((s, l) => s + l._count.level, 0)

  const learnStyleLabel: Record<string, string> = {
    READ_FIRST: "Baca dulu", CHUNK_QUIZ: "Baca sambil coba", CHALLENGE_FIRST: "Tantangan dulu",
  }
  const guidanceLabel: Record<string, string> = {
    GUIDED: "Terbimbing", SEMI_GUIDED: "Semi mandiri", INDEPENDENT: "Mandiri",
  }

  return (
    <div>
      <PageHeader title="Engagement" description="Aktivitas harian, retensi, dan distribusi user" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="DAU"
          value={fmtNumber(dau)}
          sub="aktif hari ini"
          icon={Flame}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          label="WAU"
          value={fmtNumber(wau)}
          sub="aktif 7 hari terakhir"
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="MAU"
          value={fmtNumber(activeThisMonth)}
          sub="aktif 30 hari terakhir"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Stickiness"
          value={`${totalUsers > 0 ? ((dau / totalUsers) * 100).toFixed(1) : 0}%`}
          sub="DAU/MAU ratio"
          icon={Zap}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <SectionCard
          title="Daily Active Users"
          description="30 hari terakhir"
          action={<span className="text-lg font-bold text-gray-900 tabular-nums">{fmtNumber(dau)} today</span>}
        >
          <MiniBarChart
            data={days}
            color="bg-orange-400"
            height={80}
            startLabel={days[0]?.label}
            midLabel={days[14]?.label}
            endLabel={days[29]?.label}
          />
        </SectionCard>

        <SectionCard
          title="AI Usage Harian"
          description="Total request AI 30 hari terakhir"
          action={<Brain className="h-4 w-4 text-sky-500" />}
        >
          <MiniBarChart
            data={aiDays}
            color="bg-sky-400"
            height={80}
            startLabel={aiDays[0]?.label}
            midLabel={aiDays[14]?.label}
            endLabel={aiDays[29]?.label}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <SectionCard title="Level Distribution">
          <div className="space-y-3">
            {levelDist.sort((a, b) => b._count.level - a._count.level).map((l) => {
              const pct = totalLevels > 0 ? (l._count.level / totalLevels) * 100 : 0
              return (
                <div key={l.level}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{LEVEL_LABEL[l.level ?? ""] ?? l.level}</span>
                    <span className="text-gray-400 tabular-nums">{l._count.level} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div
                      className={cn("h-1.5 rounded-full", LEVEL_COLOR[l.level ?? ""] ?? "bg-gray-400")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Preferensi Belajar">
          <p className="text-xs font-medium text-gray-500 mb-2">Gaya Belajar</p>
          <div className="space-y-2.5 mb-4">
            {learnStyleDist.map((s) => {
              const total = learnStyleDist.reduce((a, b) => a + b._count.learningStyle, 0)
              const pct = total > 0 ? (s._count.learningStyle / total) * 100 : 0
              return (
                <div key={s.learningStyle} className="flex items-center gap-2.5">
                  <span className="text-xs text-gray-500 w-32 shrink-0">
                    {learnStyleLabel[s.learningStyle ?? ""] ?? s.learningStyle}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right tabular-nums">{s._count.learningStyle}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs font-medium text-gray-500 mb-2">Mode Bimbingan</p>
          <div className="space-y-2.5">
            {guidanceDist.map((s) => {
              const total = guidanceDist.reduce((a, b) => a + b._count.guidancePreference, 0)
              const pct = total > 0 ? (s._count.guidancePreference / total) * 100 : 0
              return (
                <div key={s.guidancePreference} className="flex items-center gap-2.5">
                  <span className="text-xs text-gray-500 w-32 shrink-0">
                    {guidanceLabel[s.guidancePreference ?? ""] ?? s.guidancePreference}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right tabular-nums">{s._count.guidancePreference}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Top 10 Users by XP</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 w-8">#</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">User</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">XP</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Streak</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Topics Passed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topUsers.map((u, i) => {
              const streak = computeCurrentStreak(u.streaks.map((s) => s.date))
              return (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-gray-300 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-bold text-blue-600 shrink-0">
                        {u.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      {u.isPremium && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          Premium
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                    {u.xp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("text-sm font-medium tabular-nums", streak > 0 ? "text-orange-500" : "text-gray-300")}>
                      {streak > 0 ? `🔥 ${streak}` : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                    {u._count.topicQuizzes}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

