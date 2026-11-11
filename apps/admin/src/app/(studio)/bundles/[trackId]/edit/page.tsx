import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { PageHeader } from "../../../_components/page-header"
import { SectionCard } from "../../../_components/section-card"
import { BundleContentEditor, BundleGenerateDraftForm, BundleMetadataForm, BundlePublicationButton } from "../../bundle-admin-actions"

export default async function EditBundlePage({
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
      order: true,
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
      _count: { select: { modules: true, purchases: true, certificates: true } },
    },
  })

  if (!bundle || bundle.type !== TrackType.BUNDLE) notFound()

  const hasModules = bundle._count.modules > 0
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
        title={`Edit ${bundle.title}`}
        description={`${bundle.slug} · ${bundle._count.modules} modules · ${bundle._count.purchases} purchases · ${bundle._count.certificates} certificates`}
        actions={
          <>
            <Link
              href={`/bundles/${bundle.id}/preview`}
              className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Preview
            </Link>
            <Link
              href="/bundles"
              className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard
        title="Bundle Metadata"
        description={`Status: ${bundle.publishedAt ? "Published" : "Draft"} · update identitas, harga, urutan, dan sertifikat bundle.`}
        action={
          <BundlePublicationButton
            bundleId={bundle.id}
            publishedAt={bundle.publishedAt}
            disabled={!canPublish && !bundle.publishedAt}
            disabledReason={publishDisabledReason}
          />
        }
      >
        {!hasModules && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bundle dengan 0 module akan tetap draft. Tambahkan minimal 1 module sebelum publish.
          </div>
        )}
        <BundleMetadataForm
          bundle={{
            id: bundle.id,
            title: bundle.title,
            slug: bundle.slug,
            description: bundle.description,
            icon: bundle.icon,
            order: bundle.order,
            isFree: bundle.isFree,
            priceIdr: bundle.priceIdr,
            hasCertificate: bundle.hasCertificate,
            publishedAt: bundle.publishedAt,
            purchases: bundle._count.purchases,
          }}
        />
      </SectionCard>

      <div className="mt-4">
        <SectionCard title="Generate Draft Content" description="Generate modul dan topik dari brief admin. Hasil generate tetap bisa diedit manual.">
          <BundleGenerateDraftForm
            bundleId={bundle.id}
            defaultBrief={`${bundle.title}. ${bundle.description}`}
          />
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard title="Module & Topic Editor" description="Edit struktur modul dan topik bundle.">
          <BundleContentEditor bundleId={bundle.id} bundleIsFree={bundle.isFree} modules={bundle.modules} />
        </SectionCard>
      </div>
    </div>
  )
}
