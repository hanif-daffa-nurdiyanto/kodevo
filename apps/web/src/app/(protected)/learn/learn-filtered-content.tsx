"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Eye, Coins, Plus, Search } from "lucide-react"
import { Badge } from "@kodevo/ui/badge"
import { buttonVariants } from "@kodevo/ui/button"
import { cn } from "@kodevo/utils"

type CurriculumCard = {
  id: string
  slug: string
  icon: string | null
  title: string
  goal: string | null
  type: "CUSTOM" | "BUNDLE"
  isFree: boolean
  pct: number
  completed: boolean
  moduleLabel: string
}

type BundleCard = {
  id: string
  slug: string
  icon: string
  cover: string
  title: string
  description: string
  modules: number
  isFree: boolean
  priceIdr: number | null
  purchased: boolean
}

type BundlePagination = {
  page: number
  totalPages: number
  totalItems: number
}

type FilterKey = "all" | "bundle"
type FilterMode = FilterKey | "active"
type ProgressTab = "active" | "finished"

const filterOptions: Array<{ key: FilterMode; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Sedang Diikuti" },
  { key: "bundle", label: "Bundle" },
]

export function LearnFilteredContent({
  curricula,
  bundles,
  bundlePagination,
  canCreateMore,
  initialFilter,
  initialFilterMode,
  initialTab,
}: {
  curricula: CurriculumCard[]
  bundles: BundleCard[]
  bundlePagination: BundlePagination
  canCreateMore: boolean
  initialFilter: FilterKey
  initialFilterMode: FilterMode
  initialTab: ProgressTab
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterKey>(initialFilter)
  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode)
  const [progressTab, setProgressTab] = useState<ProgressTab>(initialTab)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredCurricula = useMemo(() => {
    if (!normalizedQuery) return curricula
    return curricula.filter((curriculum) => {
      const text = `${curriculum.title} ${curriculum.goal ?? ""}`.toLowerCase()
      return text.includes(normalizedQuery)
    })
  }, [curricula, normalizedQuery])

  const filteredBundles = useMemo(() => {
    if (!normalizedQuery) return bundles
    return bundles.filter((bundle) => bundle.title.toLowerCase().includes(normalizedQuery))
  }, [bundles, normalizedQuery])

  const showActive = filterMode !== "bundle"
  const showBundles = filterMode !== "active"
  const filteredActiveCurricula = filteredCurricula.filter((curriculum) => !curriculum.completed)
  const filteredCompletedCurricula = filteredCurricula.filter((curriculum) => curriculum.completed)
  const displayedCurricula = progressTab === "active" ? filteredActiveCurricula : filteredCompletedCurricula

  function updateUrl(next: { filter?: FilterKey; tab?: ProgressTab }) {
    const params = new URLSearchParams(window.location.search)
    if (next.filter) {
      params.set("filter", next.filter)
      params.delete("bundlePage")
    }
    if (next.tab) params.set("tab", next.tab)
    window.history.pushState(null, "", `/learn?${params.toString()}`)
  }

  function updateFilter(nextFilter: FilterMode) {
    setFilterMode(nextFilter)
    if (nextFilter === "active") {
      setFilter("all")
      setProgressTab("active")
      window.history.pushState(null, "", "/learn?tab=active")
      return
    }

    setFilter(nextFilter)
    updateUrl({ filter: nextFilter })
  }

  function updateTab(nextTab: ProgressTab) {
    setProgressTab(nextTab)
    updateUrl({ tab: nextTab })
  }

  function getCurriculumSubtitle(curriculum: CurriculumCard) {
    if (curriculum.type === "BUNDLE") return curriculum.isFree ? "Bundle Gratis" : "Bundle Dibeli"
    return curriculum.goal ?? "Level Builder"
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari track atau bundle..."
            className="h-11 w-full rounded-lg border border-input bg-white pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateFilter(option.key)}
              className={cn(
                "flex h-11 items-center rounded-lg px-4 text-sm font-semibold transition-colors",
                filterMode === option.key
                  ? "border-[1.5px] border-primary bg-secondary text-primary"
                  : "border border-input bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kodevo-gradient relative mb-10 overflow-hidden rounded-2xl px-8 py-7 text-white">
        <div className="absolute -top-10 right-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/85">💬 Ceritakan tujuanmu</p>
          <h2 className="text-[22px] font-extrabold">Ngga nemu bundle yang cocok?</h2>
          <p className="mt-1.5 text-[13px] text-white/90">Ceritakan tujuan belajarmu, AI generate roadmap yang dipersonalisasi khusus untukmu.</p>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <Link
              href="/learn/new"
              aria-label="Buat roadmap dari tujuan belajar"
              className="group flex h-12 flex-1 cursor-text items-center justify-between rounded-lg border border-white bg-white px-5 text-sm text-muted-foreground outline-none transition-all hover:border-white hover:bg-white/95 focus-visible:ring-4 focus-visible:ring-white/30"
            >
              <span className="truncate">contoh: Python untuk analisis data, membuat REST API, belajar React...</span>
              {/* <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" /> */}
            </Link>
            {canCreateMore ? (
              <Link href="/learn/new" className="flex h-12 shrink-0 items-center justify-center rounded-lg bg-kodevo-dark px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
                Buatkan Roadmap
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            ) : (
              <Link href="/credits" className="flex h-12 shrink-0 items-center justify-center rounded-lg bg-kodevo-dark px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
                <Coins className="mr-1.5 h-4 w-4" />
                Top-up Credit
              </Link>
            )}
          </div>
        </div>
      </div>

      {showActive && (
        <section className="mb-10">
          {/* <h2 className="text-base font-bold">Progress belajar</h2> */}
          <div className="mb-6 mt-4 flex gap-1 border-b border-[#F3F4F6]" role="tablist">
              {[
                { key: "active" as const, label: "Sedang diikuti", count: filteredActiveCurricula.length },
                { key: "finished" as const, label: "Selesai", count: filteredCompletedCurricula.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={progressTab === tab.key}
                  onClick={() => updateTab(tab.key)}
                  className={cn(
                    "mr-6 flex border-b-2 px-1 pb-3 text-base font-bold transition-colors hover:text-[#00A88A] cursor-pointer",
                    progressTab === tab.key
                      ? "border-kodevo-green font-bold text-foreground"
                      : "border-transparent font-medium text-muted-foreground"
                  )}
                >
                  {tab.label}
                  {/* <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {tab.count}
                  </span> */}
                </button>
              ))}
          </div>
          {displayedCurricula.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {displayedCurricula.map((curriculum) => (
                <Link key={curriculum.id} href={`/learn/${curriculum.slug}`} className="block rounded-xl border border-muted bg-white p-5 text-inherit transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0FDF4] text-base">
                      {curriculum.icon ?? "📚"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold">{curriculum.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{getCurriculumSubtitle(curriculum)}</p>
                    </div>
                  </div>
                  <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="kodevo-gradient h-full rounded-full" style={{ width: `${curriculum.pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{curriculum.moduleLabel}</span>
                    <span className="font-bold text-foreground">{curriculum.pct}%</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState text={progressTab === "active" ? "Tidak ada track aktif yang cocok dengan filter ini." : "Belum ada track selesai yang cocok dengan filter ini."} />
          )}
        </section>
      )}

      {showBundles && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Bundle tersedia</h2>
            <Link href="/learn/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
              <Plus className="h-4 w-4" />
              Buat Roadmap
            </Link>
          </div>
          {filteredBundles.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {filteredBundles.map((bundle) => {
                  const formattedPrice = bundle.isFree
                    ? "Gratis"
                    : bundle.priceIdr
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(bundle.priceIdr)
                    : "Harga belum tersedia"

                  return (
                    <div
                      key={bundle.id}
                      className="flex flex-col gap-3 rounded-xl border border-muted bg-white p-5 text-inherit transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
                    >
                      <div className={cn("flex aspect-video items-center justify-center rounded-lg text-2xl", bundle.cover)}>
                        {bundle.icon}
                      </div>
                      <div className="min-h-[98px]">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{bundle.title}</p>
                          {bundle.purchased && (
                            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Dibeli
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{bundle.description}</p>
                        <p className="mt-2 text-xs font-semibold text-foreground">
                          {bundle.modules} modul · {formattedPrice}
                        </p>
                      </div>
                      <Link href={`/learn/${bundle.slug}`} className={cn(buttonVariants({ size: "sm" }), "mt-auto gap-1.5")}>
                        <Eye className="h-4 w-4" />
                        Lihat Bundle
                      </Link>
                    </div>
                  )
                })}
              </div>
              <BundlePaginationControls pagination={bundlePagination} filter={filter} tab={progressTab} />
            </>
          ) : (
            <EmptyState text="Tidak ada bundle yang cocok dengan pencarian ini." />
          )}
        </section>
      )}
    </>
  )
}

function BundlePaginationControls({
  pagination,
  filter,
  tab,
}: {
  pagination: BundlePagination
  filter: FilterKey
  tab: ProgressTab
}) {
  if (pagination.totalPages <= 1) return null

  const pages = Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
  const previousPage = Math.max(1, pagination.page - 1)
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1)
  const getPageHref = (page: number) => {
    const params = new URLSearchParams()
    params.set("filter", filter)
    params.set("tab", tab)
    params.set("bundlePage", String(page))
    return `/learn?${params.toString()}`
  }

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-muted bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-muted-foreground">
        Halaman {pagination.page} dari {pagination.totalPages} · {pagination.totalItems.toLocaleString("id-ID")} bundle
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={getPageHref(previousPage)}
          aria-disabled={pagination.page === 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-9",
            pagination.page === 1 && "pointer-events-none opacity-45"
          )}
        >
          Sebelumnya
        </Link>
        {pages.map((page) => (
          <Link
            key={page}
            href={getPageHref(page)}
            aria-current={page === pagination.page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: page === pagination.page ? "default" : "outline", size: "sm" }),
              "h-9 min-w-9 px-3"
            )}
          >
            {page}
          </Link>
        ))}
        <Link
          href={getPageHref(nextPage)}
          aria-disabled={pagination.page === pagination.totalPages}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-9",
            pagination.page === pagination.totalPages && "pointer-events-none opacity-45"
          )}
        >
          Berikutnya
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-muted bg-white p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
