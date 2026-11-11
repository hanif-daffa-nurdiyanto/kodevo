import { db } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { Target, TrendingUp, BookOpen, AlertTriangle } from "lucide-react"
import { StatCard } from "../_components/stat-card"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"

export default async function StudioContentPage() {
  await requireAdmin()

  // Topik yang punya materi (sudah dibuka user)
  const topicsWithMaterial = await db.topic.findMany({
    where: { generatedMaterials: { some: {} } },
    select: {
      id: true,
      title: true,
      module: { select: { title: true, track: { select: { title: true } } } },
      generatedMaterials: { select: { hitCount: true } },
      quizzes: { select: { passed: true, score: true } },
    },
  })

  // Gabungkan stats: dari materi + quiz
  const topicStats = topicsWithMaterial.map((t) => {
    const totalHits    = t.generatedMaterials.reduce((s, m) => s + m.hitCount, 0)
    const totalAttempts = t.quizzes.length
    const passedCount  = t.quizzes.filter((q) => q.passed).length
    const passRate     = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : null
    const avgScore     = totalAttempts > 0
      ? t.quizzes.reduce((s, q) => s + (q.score ?? 0), 0) / totalAttempts
      : null
    return {
      id: t.id,
      title: t.title,
      module: t.module?.title ?? "—",
      track: t.module?.track?.title ?? "—",
      hits: totalHits,
      attempts: totalAttempts,
      passRate,
      avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
    }
  })

  const mostViewed    = [...topicStats].sort((a, b) => b.hits - a.hits).slice(0, 10)
  const hardestTopics = [...topicStats]
    .filter((t) => t.attempts >= 3 && t.passRate !== null)
    .sort((a, b) => (a.passRate ?? 100) - (b.passRate ?? 100))
    .slice(0, 10)

  // Word cloud dari judul topik yang punya materi (bukan dari track goal)
  const stopwords = new Set([
    "dan", "untuk", "yang", "dengan", "di", "ke", "dari", "cara",
    "membuat", "menggunakan", "dasar", "the", "a", "an", "of", "to",
    "and", "how", "make", "using", "basic", "pengenalan", "introduction",
    "dalam", "pada", "atau", "adalah", "sebagai",
  ])
  const wordFreq = new Map<string, number>()
  topicsWithMaterial.forEach((t) => {
    const words = t.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
    words.forEach((w) => wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1))
  })
  const topKeywords = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
  const maxFreq = topKeywords[0]?.[1] ?? 1

  const [totalPassedCount, totalQuizCount] = await Promise.all([
    db.topicQuiz.count({ where: { passed: true } }),
    db.topicQuiz.count(),
  ])
  const globalPassRate = totalQuizCount > 0 ? (totalPassedCount / totalQuizCount) * 100 : 0

  return (
    <div>
      <PageHeader title="Content Analytics" description="Topik populer, tingkat kesulitan, dan tren subjek" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Topik Dibuka" value={fmtNumber(topicsWithMaterial.length)} icon={BookOpen} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="Total Quiz" value={fmtNumber(totalQuizCount)} icon={Target} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard label="Total Lulus" value={fmtNumber(totalPassedCount)} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Pass Rate Global" value={`${globalPassRate.toFixed(1)}%`} icon={AlertTriangle} iconColor="text-orange-600" iconBg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <SectionCard title="Paling Sering Dibuka">
          <div className="space-y-3">
            {mostViewed.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Belum ada data.</p>}
            {mostViewed.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 truncate">{t.track}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{t.hits}x</p>
                  <p className="text-xs text-gray-400">{t.attempts > 0 ? `${t.attempts} quiz` : "belum dikuis"}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Topik Paling Susah (Pass Rate Rendah)">
          <div className="space-y-3">
            {hardestTopics.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Belum ada data cukup (min 3 attempt).</p>}
            {hardestTopics.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 truncate">{t.track}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-red-500 tabular-nums">{t.passRate?.toFixed(0)}%</p>
                  <p className="text-xs text-gray-400">{t.attempts} tries</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Subjek Populer" description={`Kata kunci dari ${topicsWithMaterial.length} topik yang sudah dibuka`} className="mb-4">
        {topKeywords.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Belum ada materi yang di-generate.</p>
          : (
            <div className="flex flex-wrap gap-2">
              {topKeywords.map(([word, freq]) => {
                const size    = 0.7 + (freq / maxFreq) * 0.7
                const opacity = 0.45 + (freq / maxFreq) * 0.55
                return (
                  <span key={word} className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 font-medium cursor-default"
                    style={{ fontSize: `${size}rem`, opacity }} title={`${freq} topik`}>
                    {word}
                  </span>
                )
              })}
            </div>
          )
        }
      </SectionCard>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Semua Topik yang Sudah Dibuka</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Topik</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Kurikulum</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Dibuka</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Quiz</th>
              <th className="px-5 py-2.5 text-xs font-semibold text-gray-500">Pass Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topicStats.sort((a, b) => b.hits - a.hits).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{t.title}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[160px] truncate">{t.track}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{t.hits}x</td>
                <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums text-xs">{t.attempts > 0 ? t.attempts : "—"}</td>
                <td className="px-5 py-2.5">
                  {t.passRate === null ? (
                    <span className="text-xs text-gray-300">belum dikuis</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${t.passRate >= 70 ? "bg-emerald-500" : t.passRate >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${t.passRate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">
                        {t.passRate.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
