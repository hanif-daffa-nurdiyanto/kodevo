import Link from "next/link"
import { CreditTxType, db, getCreditPricing } from "@kodevo/db"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { Activity, Coins, CreditCard, TrendingUp, Users, Wallet } from "lucide-react"
import { getCreditUsageSummary, getPaidUserIndex, getRevenueSummary } from "@/lib/admin-analytics"
import { StatCard } from "../_components/stat-card"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { MiniBarChart } from "../_components/mini-bar"

function fmtRp(amount: number) {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`
  return `Rp ${amount}`
}

function fmtFullRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

export default async function StudioFinancePage() {
  await requireAdmin()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const monthRanges = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      from: start,
      to: nextMonth(start),
      label: start.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
    }
  })

  const [
    pricing,
    paidUsers,
    revenueThisMonth,
    revenueLastMonth,
    creditUsageThisMonth,
    allTimeCreditUsage,
    monthlyRevenue,
    lowBalanceUsers,
    recentTopups,
    recentBundlePurchases,
  ] = await Promise.all([
    getCreditPricing(),
    getPaidUserIndex(),
    getRevenueSummary({ from: monthStart }),
    getRevenueSummary({ from: lastMonthStart, to: monthStart }),
    getCreditUsageSummary({ from: monthStart }),
    getCreditUsageSummary(),
    Promise.all(monthRanges.map((range) => getRevenueSummary({ from: range.from, to: range.to }))),
    db.creditBalance.findMany({
      where: { balance: { gt: 0, lte: 100 } },
      orderBy: { balance: "asc" },
      take: 12,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.creditTransaction.findMany({
      where: { type: CreditTxType.TOPUP },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.bundlePurchase.findMany({
      orderBy: { purchasedAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, email: true } },
        track: { select: { title: true, slug: true } },
      },
    }),
  ])

  const revenueGrowthPct = revenueLastMonth.estimatedTotalRevenueIdr > 0
    ? ((revenueThisMonth.estimatedTotalRevenueIdr - revenueLastMonth.estimatedTotalRevenueIdr) / revenueLastMonth.estimatedTotalRevenueIdr) * 100
    : 0

  const chartData = monthRanges.map((range, index) => ({
    label: range.label,
    count: Math.round(monthlyRevenue[index].estimatedTotalRevenueIdr / 1000),
  }))

  const recentPayments = [
    ...recentTopups.map((tx) => ({
      id: `topup-${tx.id}`,
      source: "Credit Top-up",
      userId: tx.userId,
      userName: tx.user.name,
      userEmail: tx.user.email,
      title: `${fmtNumber(tx.amount)} credits`,
      amountIdr: tx.amount * pricing.credit_price_idr,
      date: tx.createdAt,
    })),
    ...recentBundlePurchases.map((purchase) => ({
      id: `bundle-${purchase.id}`,
      source: "Bundle",
      userId: purchase.userId,
      userName: purchase.user.name,
      userEmail: purchase.user.email,
      title: purchase.track.title,
      amountIdr: purchase.amountPaidIdr,
      date: purchase.purchasedAt,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30)

  const topAction = creditUsageThisMonth.byAction[0]

  return (
    <div>
      <PageHeader title="Finance" description="Revenue prepaid dari credit top-up, bundle purchase, dan konsumsi credit AI." />

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue Bulan Ini"
          value={fmtRp(revenueThisMonth.estimatedTotalRevenueIdr)}
          sub={`${revenueGrowthPct >= 0 ? "+" : ""}${revenueGrowthPct.toFixed(0)}% vs bulan lalu`}
          icon={CreditCard}
          trend={revenueGrowthPct >= 0 ? "up" : "down"}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Paid Users"
          value={fmtNumber(paidUsers.userIds.length)}
          sub="top-up atau beli bundle"
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Credit Liability"
          value={fmtNumber(revenueThisMonth.outstandingCredits)}
          sub={`${fmtNumber(revenueThisMonth.usersWithCreditBalance)} users punya saldo`}
          icon={Wallet}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Credit Spent"
          value={fmtNumber(creditUsageThisMonth.spentCredits)}
          sub={`${fmtNumber(creditUsageThisMonth.debitCount)} debit bulan ini`}
          icon={Activity}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Revenue 6 Bulan"
          description="Bundle revenue + estimasi top-up revenue berdasarkan harga per credit."
          action={
            <span className="text-xs font-semibold text-emerald-600 tabular-nums">
              {fmtFullRp(revenueThisMonth.estimatedTotalRevenueIdr)} bulan ini
            </span>
          }
        >
          <MiniBarChart
            data={chartData}
            color="bg-emerald-500"
            height={86}
            startLabel={chartData[0]?.label}
            midLabel={chartData[2]?.label}
            endLabel={chartData[5]?.label}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900">{fmtFullRp(revenueThisMonth.estimatedTopupRevenueIdr)}</p>
              <p className="mt-0.5 text-gray-400">estimasi top-up</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900">{fmtFullRp(revenueThisMonth.bundleRevenueIdr)}</p>
              <p className="mt-0.5 text-gray-400">bundle revenue</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900">{fmtNumber(revenueThisMonth.topupCredits)}</p>
              <p className="mt-0.5 text-gray-400">credit sold</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Top AI Actions"
          description="Credit yang dipotong dari action AI bulan ini."
          action={<span className="text-xs font-semibold text-orange-600">{topAction?.action ?? "Belum ada debit"}</span>}
          noPadding
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Action</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Debit</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditUsageThisMonth.byAction.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada penggunaan credit bulan ini.</td>
                </tr>
              )}
              {creditUsageThisMonth.byAction.slice(0, 8).map((item) => (
                <tr key={item.action} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-medium text-gray-900">{item.action}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{fmtNumber(item.debitCount)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{fmtNumber(item.spentCredits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Recent Paying Users" description="Pembelian bundle dan top-up credit terbaru." noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">User</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Item</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada pembayaran.</td>
                  </tr>
                )}
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5">
                      <Link href={`/users/${payment.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {payment.userName ?? "—"}
                      </Link>
                      <p className="text-xs text-gray-400">{payment.userEmail} · {fmtDate(payment.date)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${payment.source === "Bundle" ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {payment.source}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-gray-600">{payment.title}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{fmtFullRp(payment.amountIdr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Low Credit Balance" description="User aktif saldo rendah untuk target top-up.">
          <div className="divide-y divide-gray-100">
            {lowBalanceUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Belum ada user dengan saldo rendah.</p>
            ) : lowBalanceUsers.map((balance) => (
              <div key={balance.userId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/users/${balance.userId}`} className="truncate text-sm font-medium text-gray-900 hover:text-blue-600">
                    {balance.user.name ?? "—"}
                  </Link>
                  <p className="truncate text-xs text-gray-400">{balance.user.email}</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  <Coins className="h-3 w-3" />
                  {fmtNumber(balance.balance)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Credit Usage All Time" description="Ringkasan konsumsi credit dari semua debit." noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">User</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Debit</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Credits Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allTimeCreditUsage.topSpenders.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada pemakaian credit.</td>
              </tr>
            )}
            {allTimeCreditUsage.topSpenders.map((item) => (
              <tr key={item.userId} className="hover:bg-gray-50/50">
                <td className="px-5 py-2.5">
                  <Link href={`/users/${item.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {item.user?.name ?? "—"}
                  </Link>
                  <p className="text-xs text-gray-400">{item.user?.email ?? item.userId}</p>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{fmtNumber(item.debitCount)}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{fmtNumber(item.spentCredits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
