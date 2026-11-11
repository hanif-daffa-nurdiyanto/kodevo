import { CreditTxType, db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import Link from "next/link"
import { BadgeCheck, ChevronRight, Coins, PackageCheck, Search } from "lucide-react"
import { cn } from "@kodevo/utils"
import { getPaidUserIndex } from "@/lib/admin-analytics"
import { PageHeader } from "../_components/page-header"

const LEVEL_BADGE: Record<string, string> = {
  UNSCREENED: "bg-gray-100 text-gray-500",
  BEGINNER:   "bg-emerald-50 text-emerald-700",
  MID:        "bg-blue-50 text-blue-700",
  ADVANCE:    "bg-violet-50 text-violet-700",
}

const PAGE_SIZE = 30

export default async function StudioUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>
}) {
  await requireAdmin()

  const { q, filter, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1"))
  const skip = (currentPage - 1) * PAGE_SIZE

  const paidUsers = await getPaidUserIndex()
  const andConditions: any[] = []
  if (q) {
    andConditions.push({ OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ] })
  }
  if (filter === "has_credit") andConditions.push({ creditBalance: { is: { balance: { gt: 0 } } } })
  if (filter === "low_credit") andConditions.push({ creditBalance: { is: { balance: { gt: 0, lte: 100 } } } })
  if (filter === "no_credit") {
    andConditions.push({
      OR: [
        { creditBalance: { is: null } },
        { creditBalance: { is: { balance: { lte: 0 } } } },
      ],
    })
  }
  if (filter === "bought_bundle") andConditions.push({ bundlePurchases: { some: {} } })
  if (filter === "never_purchased" && paidUsers.userIds.length > 0) andConditions.push({ id: { notIn: paidUsers.userIds } })
  if (filter === "beginner") andConditions.push({ level: "BEGINNER" })
  if (filter === "mid") andConditions.push({ level: "MID" })
  if (filter === "advance") andConditions.push({ level: "ADVANCE" })

  const where = andConditions.length > 0 ? { AND: andConditions } : {}

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, level: true, xp: true,
        createdAt: true,
        creditBalance: { select: { balance: true } },
        creditTransactions: {
          where: { type: CreditTxType.TOPUP },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        bundlePurchases: {
          orderBy: { purchasedAt: "desc" },
          take: 1,
          select: { purchasedAt: true, track: { select: { title: true } } },
        },
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        _count: { select: { topicQuizzes: true, curricula: true, bundlePurchases: true } },
      },
    }),
    db.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filters = [
    { key: "",                label: "All" },
    { key: "has_credit",      label: "Has Credit" },
    { key: "low_credit",      label: "Low Credit" },
    { key: "no_credit",       label: "No Credit" },
    { key: "bought_bundle",   label: "Bought Bundle" },
    { key: "never_purchased", label: "Never Purchased" },
    { key: "beginner",        label: "Beginner" },
    { key: "mid",             label: "Mid" },
    { key: "advance",         label: "Advance" },
  ]

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    if (q && params.q !== "") p.set("q", params.q ?? q)
    if (params.filter) p.set("filter", params.filter)
    if (params.page) p.set("page", params.page)
    return `/users?${p.toString()}`
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total.toLocaleString()} total user`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative" action="/users" method="GET">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama atau email..."
            className="w-64 rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
        </form>
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={buildUrl({ filter: f.key || undefined, page: "1" })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                (filter ?? "") === f.key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
        <table className="min-w-[1020px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Level</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">XP</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Curricula</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Topics Done</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Credit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Bundles</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Last Purchase</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Last Active</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/60">Joined</th>
              <th className="px-4 py-3 bg-gray-50/60"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const lastActive = u.streaks[0]?.date
              const creditBalance = u.creditBalance?.balance ?? 0
              const lastTopup = u.creditTransactions[0]?.createdAt ?? null
              const lastBundlePurchase = u.bundlePurchases[0]?.purchasedAt ?? null
              const lastPurchase = [lastTopup, lastBundlePurchase]
                .filter((date): date is Date => Boolean(date))
                .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
              const hasBundle = u._count.bundlePurchases > 0
              const hasTopup = Boolean(lastTopup)
              const isPaid = hasBundle || hasTopup
              return (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-bold text-blue-600 shrink-0">
                        {u.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.name ?? "—"}</p>
                          {isPaid && <BadgeCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          {hasBundle && (
                            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Bundle</span>
                          )}
                          {hasTopup && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Credit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", LEVEL_BADGE[u.level])}>
                      {u.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{u.xp.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{u._count.curricula}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{u._count.topicQuizzes}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    <span className={cn(
                      "inline-flex items-center justify-end gap-1 font-semibold",
                      creditBalance > 100 ? "text-emerald-600" : creditBalance > 0 ? "text-orange-600" : "text-gray-300"
                    )}>
                      <Coins className="h-3 w-3" />
                      {creditBalance.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    <span className={cn("inline-flex items-center justify-end gap-1 font-semibold", hasBundle ? "text-violet-600" : "text-gray-300")}>
                      <PackageCheck className="h-3 w-3" />
                      {u._count.bundlePurchases}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {lastPurchase
                      ? lastPurchase.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {lastActive
                      ? new Date(lastActive).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${u.id}`}
                      className="flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {users.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Tidak ada user ditemukan.</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {currentPage} of {totalPages} · {total} users
          </p>
          <div className="flex gap-1.5">
            {currentPage > 1 && (
              <Link
                href={buildUrl({ page: String(currentPage - 1) })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={buildUrl({ page: String(currentPage + 1) })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
