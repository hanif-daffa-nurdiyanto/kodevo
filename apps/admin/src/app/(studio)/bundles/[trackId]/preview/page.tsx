import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { BadgeCheck, BookOpen, ChevronLeft, Pencil } from "lucide-react"
import { PageHeader } from "../../../_components/page-header"
import { SectionCard } from "../../../_components/section-card"
import { BundlePublicationButton } from "../../bundle-admin-actions"

function fmtRp(amount: number | null) {
  if (!amount) return "Harga belum diatur"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function PreviewBundlePage({
  params,
}: {
  params: Promise<{ trackId: string }>
}) {
  await requireAdmin()

  const { trackId } = await params
  const bundle = await db.track.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      type: true,
      title: true,
      slug: true,
      description: true,
      icon: true,
      isFree: true,
      priceIdr: true,
      hasCertificate: true,
      publishedAt: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          isFree: true,
          topics: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              learningObjective: true,
              order: true,
            },
          },
        },
      },
      _count: { select: { purchases: true, certificates: true } },
    },
  })

  if (!bundle || bundle.type !== TrackType.BUNDLE) notFound()

  const totalTopics = bundle.modules.reduce((sum, mod) => sum + mod.topics.length, 0)
  const hasModules = bundle.modules.length > 0
  const hasValidPrice = bundle.isFree || Boolean(bundle.priceIdr && bundle.priceIdr > 0)
  const canPublish = hasModules && hasValidPrice
  const publishDisabledReason = !hasModules
    ? "Bundle belum bisa dipublish karena belum memiliki module."
    : !hasValidPrice
      ? "Bundle berbayar perlu harga sebelum publish."
      : undefined

  return (
    <div>
      <PageHeader
        title={`Preview ${bundle.title}`}
        description={`${bundle.slug} · ${bundle.publishedAt ? "Published" : "Draft"} · ${bundle.modules.length} modules · ${totalTopics} topics`}
        actions={
          <>
            <Link
              href={`/bundles/${bundle.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <Link
              href="/bundles"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </>
        }
      />

      <SectionCard
        title="Publication"
        description={canPublish ? "Preview bundle sebelum tampil di landing, learn, dan checkout user." : "Lengkapi harga untuk bundle berbayar dan minimal 1 module sebelum publish."}
        action={
          <BundlePublicationButton
            bundleId={bundle.id}
            publishedAt={bundle.publishedAt}
            disabled={!canPublish && !bundle.publishedAt}
            disabledReason={publishDisabledReason}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{bundle.publishedAt ? "Published" : "Draft"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Price</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{bundle.isFree ? "Gratis" : fmtRp(bundle.priceIdr)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Content</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{bundle.modules.length} modules · {totalTopics} topics</p>
            {!hasModules && <p className="mt-1 text-xs font-medium text-amber-600">Tetap draft sampai module ditambahkan</p>}
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Certificate</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{bundle.hasCertificate ? "Enabled" : "Off"}</p>
          </div>
        </div>
      </SectionCard>

      <div className="mt-4">
        <SectionCard title="User-Facing Preview" description="Tampilan ringkas konten yang akan dilihat user.">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-2xl">
                  {bundle.icon ?? "📚"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{bundle.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{bundle.description}</p>
                </div>
              </div>
              <div className="shrink-0 rounded-lg bg-gray-50 px-4 py-3 text-right">
                <p className="text-xs font-medium text-gray-500">Bundle Price</p>
                <p className="mt-1 text-base font-bold text-gray-900">{bundle.isFree ? "Gratis" : fmtRp(bundle.priceIdr)}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                <BookOpen className="h-3.5 w-3.5" />
                {bundle.modules.length} modules
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                <BadgeCheck className="h-3.5 w-3.5" />
                {bundle.hasCertificate ? "Certificate included" : "Project-based"}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard title="Modules & Topics" description="Urutan konten bundle.">
          {/* {!bundle.isFree && (
            <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Bundle berbayar otomatis tidak memotong credit setelah user membeli bundle.
            </div>
          )} */}
          {bundle.modules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-8 text-center">
              <p className="text-sm font-semibold text-amber-800">Belum ada module.</p>
              <p className="mt-1 text-xs text-amber-700">Bundle ini tetap draft dan belum bisa dipublish.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bundle.modules.map((mod) => (
                <div key={mod.id} className="rounded-lg border border-gray-200">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Module {mod.order}: {mod.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{mod.description}</p>
                      </div>
                      {bundle.isFree && (
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                          {mod.isFree ? "Free" : "Paid"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {mod.topics.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-400">Belum ada topic.</p>
                    ) : (
                      mod.topics.map((topic) => (
                        <div key={topic.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{topic.order}. {topic.title}</p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">{topic.description}</p>
                          <p className="mt-1 text-xs font-medium text-blue-600">{topic.learningObjective}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
