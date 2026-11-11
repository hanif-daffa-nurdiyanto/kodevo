import Link from "next/link"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { Award, Boxes, CircleDollarSign, Eye, PackageCheck, Pencil, Plus } from "lucide-react"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"

const PAGE_SIZE = 10
const filterOptions = [
  { value: "all", label: "Semua" },
  { value: "priced", label: "Punya harga" },
  { value: "free", label: "Gratis" },
  { value: "unpriced", label: "Harga kosong" },
  { value: "certificate", label: "Sertifikat aktif" },
  { value: "no-certificate", label: "Tanpa sertifikat" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "purchased", label: "Sudah dibeli" },
] as const
const sortOptions = [
  { value: "order", label: "Urutan konten" },
  { value: "title-asc", label: "Nama A-Z" },
  { value: "title-desc", label: "Nama Z-A" },
  { value: "price-asc", label: "Harga termurah" },
  { value: "price-desc", label: "Harga termahal" },
  { value: "modules-desc", label: "Modul terbanyak" },
  { value: "purchases-desc", label: "Pembelian terbanyak" },
] as const

type BundleFilter = (typeof filterOptions)[number]["value"]
type BundleSort = (typeof sortOptions)[number]["value"]

function fmtRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function parsePage(value?: string): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function parseFilter(value?: string): BundleFilter {
  return filterOptions.some((option) => option.value === value) ? value as BundleFilter : "all"
}

function parseSort(value?: string): BundleSort {
  return sortOptions.some((option) => option.value === value) ? value as BundleSort : "order"
}

function getBundleWhere(query: string, filter: BundleFilter) {
  return {
    type: TrackType.BUNDLE,
    ...(query
      ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { slug: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
      : {}),
    ...(filter === "priced" ? { priceIdr: { gt: 0 } } : {}),
    ...(filter === "free" ? { isFree: true } : {}),
    ...(filter === "unpriced" ? { priceIdr: null } : {}),
    ...(filter === "certificate" ? { hasCertificate: true } : {}),
    ...(filter === "no-certificate" ? { hasCertificate: false } : {}),
    ...(filter === "published" ? { publishedAt: { not: null } } : {}),
    ...(filter === "draft" ? { publishedAt: null } : {}),
    ...(filter === "purchased" ? { purchases: { some: {} } } : {}),
  }
}

function getBundleOrderBy(sort: BundleSort) {
  if (sort === "title-asc") return [{ title: "asc" as const }]
  if (sort === "title-desc") return [{ title: "desc" as const }]
  if (sort === "price-asc") return [{ priceIdr: "asc" as const }, { title: "asc" as const }]
  if (sort === "price-desc") return [{ priceIdr: "desc" as const }, { title: "asc" as const }]
  if (sort === "modules-desc") return [{ modules: { _count: "desc" as const } }, { title: "asc" as const }]
  if (sort === "purchases-desc") return [{ purchases: { _count: "desc" as const } }, { title: "asc" as const }]
  return [{ order: "asc" as const }, { title: "asc" as const }]
}

function buildBundlesHref(params: {
  page?: number
  query: string
  filter: BundleFilter
  sort: BundleSort
}) {
  const search = new URLSearchParams()
  if (params.query) search.set("q", params.query)
  if (params.filter !== "all") search.set("filter", params.filter)
  if (params.sort !== "order") search.set("sort", params.sort)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()
  return qs ? `/bundles?${qs}` : "/bundles"
}

export default async function StudioBundlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const query = (params.q ?? "").trim()
  const filter = parseFilter(params.filter)
  const sort = parseSort(params.sort)
  const requestedPage = parsePage(params.page)
  const where = getBundleWhere(query, filter)

  const [totalBundles, pricedBundles, publishedBundles, matchingCount, purchaseRevenue] = await Promise.all([
    db.track.count({ where: { type: TrackType.BUNDLE } }),
    db.track.count({ where: { type: TrackType.BUNDLE, OR: [{ isFree: true }, { priceIdr: { gt: 0 } }] } }),
    db.track.count({ where: { type: TrackType.BUNDLE, publishedAt: { not: null } } }),
    db.track.count({ where }),
    db.bundlePurchase.groupBy({
      by: ["trackId"],
      _sum: { amountPaidIdr: true },
      _count: { id: true },
    }),
  ])
  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const bundles = await db.track.findMany({
    where,
    orderBy: getBundleOrderBy(sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      _count: {
        select: {
          modules: true,
          purchases: true,
          certificates: true,
        },
      },
    },
  })

  const totalRevenue = purchaseRevenue.reduce((sum, item) => sum + (item._sum.amountPaidIdr ?? 0), 0)
  const revenueByTrack = new Map(
    purchaseRevenue.map((item) => [
      item.trackId,
      {
        revenue: item._sum.amountPaidIdr ?? 0,
        purchases: item._count.id,
      },
    ])
  )

  return (
    <div>
      <PageHeader
        title="Bundles"
        description="Kelola daftar bundle track yang tampil dan bisa dibeli user."
        actions={
          <Link
            href="/bundles/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Bundle
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Bundles"
          value={fmtNumber(totalBundles)}
          sub="bundle track"
          icon={PackageCheck}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Configured"
          value={fmtNumber(pricedBundles)}
          sub="gratis/berbayar"
          icon={CircleDollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Published"
          value={fmtNumber(publishedBundles)}
          sub="live di user app"
          icon={Award}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Bundle Revenue"
          value={fmtRp(totalRevenue)}
          sub="lifetime"
          icon={Boxes}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      <SectionCard title="Bundle List" description={`${fmtNumber(matchingCount)} bundle sesuai filter.`} noPadding>
        <form action="/bundles" className="grid gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4 lg:grid-cols-[1fr_180px_220px_auto]">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search title, slug, description"
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400"
          />
          <select
            name="filter"
            defaultValue={filter}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Terapkan
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-[1160px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Bundle</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Slug</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Price</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Modules</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Purchases</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Revenue</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Certificate</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bundles.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-gray-400">
                    Tidak ada bundle yang cocok dengan filter.
                  </td>
                </tr>
              )}
              {bundles.map((bundle) => {
                const purchaseStats = revenueByTrack.get(bundle.id)
                return (
                  <tr key={bundle.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
                          {bundle.icon ?? "📚"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{bundle.title}</p>
                          <p className="line-clamp-2 max-w-[360px] text-xs leading-5 text-gray-400">{bundle.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/curricula?track=${bundle.slug}`} className="font-mono text-xs text-blue-600 hover:text-blue-700">
                        {bundle.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                      {bundle.isFree ? "Gratis" : bundle.priceIdr ? fmtRp(bundle.priceIdr) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={bundle._count.modules === 0 ? "font-semibold text-amber-600" : "text-gray-600"}>
                        {fmtNumber(bundle._count.modules)}
                      </span>
                      {bundle._count.modules === 0 && <p className="mt-1 text-[10px] font-semibold text-amber-600">Draft only</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmtNumber(purchaseStats?.purchases ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">{fmtRp(purchaseStats?.revenue ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={bundle.publishedAt ? "rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600" : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"}>
                        {bundle.publishedAt ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={bundle.hasCertificate ? "flex gap-1 items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600" : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500"}>
                        {bundle.hasCertificate 
                        ? <><span>{`${fmtNumber(bundle._count.certificates)}`}</span> <span>issued</span></>
                        : "Off"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/bundles/${bundle.id}/preview`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Link>
                        <Link
                          href={`/bundles/${bundle.id}/edit`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-gray-500">
            Page {fmtNumber(page)} of {fmtNumber(totalPages)} · {fmtNumber(matchingCount)} results
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildBundlesHref({ page: Math.max(1, page - 1), query, filter, sort })}
              aria-disabled={page === 1}
              className={`rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 ${page === 1 ? "pointer-events-none opacity-45" : ""}`}
            >
              Previous
            </Link>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Link
                key={pageNumber}
                href={buildBundlesHref({ page: pageNumber, query, filter, sort })}
                aria-current={pageNumber === page ? "page" : undefined}
                className={pageNumber === page
                  ? "rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              href={buildBundlesHref({ page: Math.min(totalPages, page + 1), query, filter, sort })}
              aria-disabled={page === totalPages}
              className={`rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 ${page === totalPages ? "pointer-events-none opacity-45" : ""}`}
            >
              Next
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
