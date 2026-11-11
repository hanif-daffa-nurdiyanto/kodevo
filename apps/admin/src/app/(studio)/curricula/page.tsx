import { db } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { PageHeader } from "../_components/page-header"
import { StatCard } from "../_components/stat-card"
import { BookOpen, Users, Layers } from "lucide-react"

export default async function StudioCurriculaPage() {
  await requireAdmin()

  const [totalTracks, tracks] = await Promise.all([
    db.track.count({ where: { userId: { not: null } } }),
    db.track.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        modules: {
          include: {
            topics: {
              include: {
                generatedMaterials: { select: { id: true } },
                quizzes: { select: { id: true, passed: true } },
              },
            },
          },
        },
      },
    }),
  ])

  const uniqueUsers = new Set(tracks.map((t) => t.userId)).size

  return (
    <div>
      <PageHeader title="Curricula" description="Semua kurikulum yang dibuat user" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Kurikulum" value={fmtNumber(totalTracks)} icon={BookOpen} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="User Pembuat" value={fmtNumber(uniqueUsers)} icon={Users} iconColor="text-violet-600" iconBg="bg-violet-50" />
        <StatCard label="Ditampilkan" value={fmtNumber(tracks.length)} icon={Layers} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Kurikulum</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">User</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Modul</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Topik</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Materi</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Quiz Lulus</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tracks.map((t) => {
              const totalTopics   = t.modules.reduce((s, m) => s + m.topics.length, 0)
              const totalMaterials = t.modules.reduce((s, m) => s + m.topics.reduce((ss, tp) => ss + tp.generatedMaterials.length, 0), 0)
              const totalPassed   = t.modules.reduce((s, m) => s + m.topics.reduce((ss, tp) => ss + tp.quizzes.filter((q) => q.passed).length, 0), 0)
              return (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 max-w-[220px] truncate">
                      {t.icon} {t.title}
                    </p>
                    {t.goal && (
                      <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">{t.goal}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{t.user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{t.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{t.modules.length}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{totalTopics}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={totalMaterials > 0 ? "text-emerald-600 font-medium" : "text-gray-300"}>
                      {totalMaterials}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={totalPassed > 0 ? "text-blue-600 font-medium" : "text-gray-300"}>
                      {totalPassed}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400 tabular-nums">
                    {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
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
