import { db } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"
import { BookOpen, AlertTriangle, Eye, Flag } from "lucide-react"
import Link from "next/link"

export default async function StudioMaterialsPage() {
  await requireAdmin()

  const [totalMaterials, totalFeedbacks, openFeedbacks, materials, feedbacks] = await Promise.all([
    db.generatedMaterial.count(),
    db.materialFeedback.count(),
    db.materialFeedback.count({ where: { status: "OPEN" } }),

    db.generatedMaterial.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        topic: {
          select: {
            title: true,
            module: { select: { title: true, track: { select: { title: true } } } },
          },
        },
      },
    }),

    db.materialFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        topic: {
          select: {
            title: true,
            module: { select: { title: true, track: { select: { title: true } } } },
          },
        },
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  const TYPE_LABEL: Record<string, string> = {
    WRONG_CONTENT: "Konten salah",
    TYPO: "Typo",
    TOO_EASY: "Terlalu mudah",
    TOO_HARD: "Terlalu sulit",
    OTHER: "Lainnya",
  }

  const LEVEL_LABEL: Record<string, string> = {
    UNSCREENED: "Unscreened",
    BEGINNER: "Beginner",
    MID: "Mid",
    ADVANCE: "Advanced",
  }

  return (
    <div>
      <PageHeader title="Materials" description="Konten yang sudah di-generate dan laporan dari user" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Materi" value={fmtNumber(totalMaterials)} icon={BookOpen} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="Total Laporan" value={fmtNumber(totalFeedbacks)} icon={Flag} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard label="Laporan Open" value={fmtNumber(openFeedbacks)} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard label="Cache Hit" value={fmtNumber(materials.reduce((s, m) => s + m.hitCount, 0))} icon={Eye} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      </div>

      {/* Feedbacks */}
      <SectionCard title="Laporan Masalah Materi" className="mb-4">
        {feedbacks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada laporan.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {feedbacks.map((f) => (
              <div key={f.id} className="py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      f.status === "OPEN" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {f.status}
                    </span>
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[f.type] ?? f.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{f.topic.title}</p>
                  <p className="text-xs text-gray-400 truncate">{f.topic.module.track?.title} · {f.topic.module.title}</p>
                  {f.message && (
                    <p className="text-xs text-gray-600 mt-1 italic">"{f.message}"</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{f.user.name ?? f.user.email}</p>
                  <p className="text-xs text-gray-300">{new Date(f.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Generated Materials */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Materi yang Di-generate</p>
          <span className="text-xs text-gray-400">{fmtNumber(totalMaterials)} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Topik</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Track</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Level</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Cache Hit</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-2.5 max-w-[220px]">
                  <Link href={`/materials/${m.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                    {m.topic.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[160px] truncate">{m.topic.module.track?.title ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    {LEVEL_LABEL[m.level] ?? m.level}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums font-medium">{m.hitCount}x</td>
                <td className="px-5 py-2.5 text-right text-gray-400 text-xs tabular-nums">
                  {new Date(m.createdAt).toLocaleDateString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
