import { db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import { notFound } from "next/navigation"
import { PageHeader } from "../../_components/page-header"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DeleteMaterialButton } from "./delete-button"

const LEVEL_LABEL: Record<string, string> = {
  UNSCREENED: "Unscreened",
  BEGINNER: "Beginner",
  MID: "Mid",
  ADVANCE: "Advanced",
}

const STYLE_LABEL: Record<string, string> = {
  READ_FIRST: "Baca dulu",
  CHUNK_QUIZ: "Baca sambil coba",
  CHALLENGE_FIRST: "Tantangan dulu",
}

const GUIDANCE_LABEL: Record<string, string> = {
  GUIDED: "Terbimbing",
  SEMI_GUIDED: "Semi mandiri",
  INDEPENDENT: "Mandiri",
}

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const material = await db.generatedMaterial.findUnique({
    where: { id },
    include: {
      topic: {
        select: {
          title: true,
          learningObjective: true,
          module: { select: { title: true, track: { select: { title: true } } } },
        },
      },
    },
  })

  if (!material) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/materials" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Materials
        </Link>
        <DeleteMaterialButton id={material.id} />
      </div>

      <PageHeader
        title={material.topic.title}
        description={`${material.topic.module.track?.title ?? "—"} · ${material.topic.module.title}`}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
          {LEVEL_LABEL[material.level] ?? material.level}
        </span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {STYLE_LABEL[material.learningStyle] ?? material.learningStyle}
        </span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {GUIDANCE_LABEL[material.guidance] ?? material.guidance}
        </span>
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
          {material.hitCount}x cache hit
        </span>
        <span className="text-xs text-gray-400 px-2 py-1">
          Dibuat {new Date(material.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {material.topic.learningObjective && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-1">Learning Objective</p>
          <p className="text-sm text-gray-700">{material.topic.learningObjective}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Konten Materi</p>
        <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
          {material.content}
        </pre>
      </div>
    </div>
  )
}
