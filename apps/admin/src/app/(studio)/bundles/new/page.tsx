import Link from "next/link"
import { requireAdmin } from "@kodevo/auth/admin"
import { PageHeader } from "../../_components/page-header"
import { SectionCard } from "../../_components/section-card"
import { BundleCreateForm } from "../bundle-admin-actions"

export default async function NewBundlePage() {
  await requireAdmin()

  return (
    <div>
      <PageHeader
        title="New Bundle"
        description="Buat bundle metadata baru. Modul dan topik bisa dilengkapi pada tahap berikutnya."
        actions={
          <Link
            href="/bundles"
            className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Back
          </Link>
        }
      />

      <SectionCard title="Bundle Metadata" description="Isi identitas, harga, dan status sertifikat bundle.">
        <BundleCreateForm />
      </SectionCard>
    </div>
  )
}
