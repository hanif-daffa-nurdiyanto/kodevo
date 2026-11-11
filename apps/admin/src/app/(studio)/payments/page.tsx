import Link from "next/link"
import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { db } from "@kodevo/db"
import { Coins, PackageCheck, Wallet } from "lucide-react"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"
import { CreditAdjustmentForm } from "./payment-admin-actions"

function fmtRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export default async function StudioPaymentsPage() {
  await requireAdmin()

  const [creditTransactions, bundlePurchases, creditSummary, topupSummary] = await Promise.all([
    db.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.bundlePurchase.findMany({
      orderBy: { purchasedAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        track: { select: { id: true, slug: true, title: true, priceIdr: true } },
      },
    }),
    db.creditBalance.aggregate({
      _sum: { balance: true },
      _count: { userId: true },
    }),
    db.creditTransaction.aggregate({
      where: { type: "TOPUP" },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  const bundleRevenue = bundlePurchases.reduce((sum, purchase) => sum + purchase.amountPaidIdr, 0)

  return (
    <div>
      <PageHeader title="Payments" description="Credit transactions, bundle purchases, dan manual adjustment." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Credit Outstanding"
          value={fmtNumber(creditSummary._sum.balance ?? 0)}
          sub={`${fmtNumber(creditSummary._count.userId)} users punya saldo`}
          icon={Wallet}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Top-up Transactions"
          value={fmtNumber(topupSummary._count.id)}
          sub={`${fmtNumber(topupSummary._sum.amount ?? 0)} credit terjual`}
          icon={Coins}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Bundle Purchases"
          value={fmtNumber(bundlePurchases.length)}
          sub={`${fmtRp(bundleRevenue)} recent revenue`}
          icon={PackageCheck}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Credit Transactions" description="50 transaksi credit terbaru." noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Action</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Amount</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada transaksi credit.</td>
                </tr>
              )}
              {creditTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5">
                    <Link href={`/users/${tx.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {tx.user.name ?? "—"}
                    </Link>
                    <p className="text-xs text-gray-400">{tx.user.email} · {fmtDate(tx.createdAt)}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{tx.type}</span>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-xs text-gray-500">{tx.action ?? tx.refId ?? "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${tx.type === "DEBIT" ? "text-red-500" : "text-emerald-600"}`}>
                    {tx.type === "DEBIT" ? "-" : "+"}{fmtNumber(tx.amount)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums text-gray-900">{fmtNumber(tx.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Manual Credit Adjustment" description="Gunakan untuk koreksi support, refund, atau bonus credit.">
          <CreditAdjustmentForm />
        </SectionCard>
      </div>

      <div className="mb-4">
        <SectionCard title="Bundle Purchases" description="50 pembelian bundle terbaru." noPadding>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Bundle</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bundlePurchases.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada pembelian bundle.</td>
                </tr>
              )}
              {bundlePurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5">
                    <Link href={`/users/${purchase.userId}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {purchase.user.name ?? "—"}
                    </Link>
                    <p className="text-xs text-gray-400">{purchase.user.email} · {fmtDate(purchase.purchasedAt)}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{purchase.track.title}</p>
                    <p className="max-w-[180px] truncate text-xs text-gray-400">{purchase.mayarTransactionId ?? "manual/no transaction id"}</p>
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-gray-900">{fmtRp(purchase.amountPaidIdr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  )
}
