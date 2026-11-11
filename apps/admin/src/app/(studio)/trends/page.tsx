import { db } from "@kodevo/db"
import { extractTrendingTopics, TOPIC_MAP } from "@/lib/topic-trends"
import { PageHeader } from "../_components/page-header"
import { TrendingUp } from "lucide-react"

export default async function TrendsPage() {
  const tracks = await db.track.findMany({
    select: { goal: true, createdAt: true },
    where: { goal: { not: null } },
    orderBy: { createdAt: "desc" },
  })

  const goals = tracks.map((t) => t.goal!).filter(Boolean)
  const trending = extractTrendingTopics(goals)

  // Unmatched goals (not mapped to any known topic)
  const unmatchedGoals = goals.filter((goal) => {
    const lower = goal.toLowerCase()
    return !TOPIC_MAP.some((t) => t.variants.some((v) => lower.includes(v)))
  })

  const totalMapped = goals.length - unmatchedGoals.length

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader
        title="Topic Trends"
        description="Topik yang paling banyak dibuat user — dari analisis goal kurikulum"
      />

      <div className="mt-6 grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total kurikulum</p>
          <p className="text-2xl font-bold mt-1">{goals.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Berhasil dipetakan</p>
          <p className="text-2xl font-bold mt-1">{totalMapped}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Belum dipetakan</p>
          <p className="text-2xl font-bold mt-1">{unmatchedGoals.length}</p>
        </div>
      </div>

      {/* Trending topics */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Trending Topics</h2>
      <div className="space-y-2 mb-10">
        {trending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data cukup.</p>
        ) : (
          trending.map((topic, i) => {
            const pct = goals.length > 0 ? Math.round((topic.count / goals.length) * 100) : 0
            return (
              <div key={topic.label} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}</span>
                <span className="text-xl">{topic.icon}</span>
                <span className="font-medium text-sm flex-1">{topic.label}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                    {topic.count}x ({pct}%)
                  </span>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
            )
          })
        )}
      </div>

      {/* Unmatched goals */}
      {unmatchedGoals.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Goal belum dipetakan ({unmatchedGoals.length})
          </h2>
          <div className="rounded-xl border bg-card divide-y max-h-96 overflow-y-auto">
            {unmatchedGoals.slice(0, 100).map((goal, i) => (
              <p key={i} className="px-4 py-2 text-sm text-muted-foreground">{goal}</p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Goal yang belum dipetakan bisa dijadikan dasar untuk tambah keyword baru ke TOPIC_MAP.
          </p>
        </>
      )}
    </div>
  )
}
