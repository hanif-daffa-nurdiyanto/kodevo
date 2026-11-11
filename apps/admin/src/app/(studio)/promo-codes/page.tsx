import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { PageHeader } from "../_components/page-header"
import { PromoCodesClient } from "./promo-codes-client"

export default async function PromoCodesPage() {
  await requireAdmin()

  const [promos, creditPackages, bundles] = await Promise.all([
    db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    }),
    db.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { credits: "asc" }],
      select: { id: true, label: true, credits: true, priceIdr: true },
    }),
    db.track.findMany({
      where: { type: TrackType.BUNDLE },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true, priceIdr: true, isFree: true },
    }),
  ])

  return (
    <div>
      <PageHeader title="Promo Codes" description="Kelola kode diskon untuk bundle dan top-up credit." />
      <PromoCodesClient initialPromos={promos as any} creditPackages={creditPackages} bundles={bundles} />
    </div>
  )
}
