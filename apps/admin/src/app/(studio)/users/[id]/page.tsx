import { CreditTxType, db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import { notFound } from "next/navigation"
import { computeCurrentStreak } from "@/lib/rate-limit"
import Link from "next/link"
import { ArrowLeft, BadgeCheck, CheckCircle2, Coins, Flame, PackageCheck, ReceiptText, Wallet, XCircle } from "lucide-react"
import { cn } from "@kodevo/utils"
import { getUserCreditSummary } from "@/lib/admin-analytics"
import { SectionCard } from "../../_components/section-card"

const LEVEL_LABEL: Record<string, string> = {
  UNSCREENED: "Unscreened",
  BEGINNER: "Beginner",
  MID: "Mid",
  ADVANCE: "Advanced",
}

const LEVEL_BADGE: Record<string, string> = {
  UNSCREENED: "bg-gray-100 text-gray-500",
  BEGINNER: "bg-emerald-50 text-emerald-700",
  MID: "bg-blue-50 text-blue-700",
  ADVANCE: "bg-violet-50 text-violet-700",
}

export default async function StudioUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    include: {
      streaks: { orderBy: { date: "desc" }, take: 120, select: { date: true } },
      curricula: {
        where: { userId: id },
        orderBy: { id: "desc" },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: { topics: { select: { id: true } } },
          },
        },
      },
      topicQuizzes: { where: { passed: true }, select: { topicId: true, createdAt: true } },
      bundlePurchases: {
        orderBy: { purchasedAt: "desc" },
        include: { track: { select: { id: true, title: true, slug: true, priceIdr: true, hasCertificate: true } } },
      },
      certificates: {
        orderBy: { issuedAt: "desc" },
        include: { track: { select: { title: true } } },
      },
      _count: { select: { topicQuizzes: true, curricula: true, bundlePurchases: true, certificates: true } },
    },
  })

  if (!user) notFound()

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const [creditSummary, debitTransactions14d] = await Promise.all([
    getUserCreditSummary(user.id),
    db.creditTransaction.findMany({
      where: { userId: user.id, type: CreditTxType.DEBIT, createdAt: { gte: fourteenDaysAgo } },
      orderBy: { createdAt: "asc" },
      select: { amount: true, action: true, createdAt: true },
    }),
  ])

  const streak = computeCurrentStreak(user.streaks.map((s) => s.date))
  const passedSet = new Set(user.topicQuizzes.map((q) => q.topicId))
  const isPaid = creditSummary.topupCount > 0 || user.bundlePurchases.length > 0
  const hasCredit = creditSummary.balance > 0
  const dailyCreditUsage = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(fourteenDaysAgo)
    date.setDate(fourteenDaysAgo.getDate() + index)
    const key = date.toISOString().slice(0, 10)
    const amount = debitTransactions14d
      .filter((tx) => tx.createdAt.toISOString().slice(0, 10) === key)
      .reduce((sum, tx) => sum + tx.amount, 0)
    return { date, amount }
  })
  const maxCreditUsage = Math.max(...dailyCreditUsage.map((usage) => usage.amount), 1)

  const pendidikanLabel: Record<string, string> = {
    SMP: "SMP", SMA: "SMA/SMK", D3: "D3", S1: "S1", S2: "S2", S3: "S3",
    BOOTCAMP: "Bootcamp", SELF_TAUGHT: "Self-taught",
  }
  const genderLabel: Record<string, string> = {
    MALE: "Laki-laki", FEMALE: "Perempuan", OTHER: "Lainnya", PREFER_NOT: "Tidak disebutkan",
  }
  function fmtDate(date: Date) {
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2 -mb-1">
        <Link
          href="/users"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Users
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-xs text-gray-700 font-medium">{user.name ?? user.email}</span>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-blue-50 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
            {user.name?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{user.name ?? "—"}</h1>
              {isPaid && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", LEVEL_BADGE[user.level])}>
                {LEVEL_LABEL[user.level]}
              </span>
              {user.bundlePurchases.length > 0 && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Bundle Buyer</span>
              )}
              {hasCredit && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Has Credit</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            {user.username && (
              <p className="text-xs text-gray-400 mt-0.5">@{user.username}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Link
            href="/payments"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Wallet className="h-4 w-4" />
            Credit Tools
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-100 md:grid-cols-6">
          {[
            { label: "XP", value: user.xp.toLocaleString() },
            { label: "Streak", value: streak > 0 ? `${streak} days` : "0 days", highlight: streak > 0 },
            { label: "Topics Done", value: passedSet.size.toString() },
            { label: "Curricula", value: user._count.curricula.toString() },
            { label: "Credit", value: creditSummary.balance.toLocaleString("id-ID"), highlight: creditSummary.balance > 0 },
            { label: "Bundles", value: user._count.bundlePurchases.toString(), highlight: user._count.bundlePurchases > 0 },
          ].map((s) => (
            <div key={s.label} className="text-center rounded-lg bg-gray-50 py-3 px-2">
              <p className={cn("text-xl font-bold tabular-nums", s.highlight ? "text-orange-500" : "text-gray-900")}>
                {s.highlight && <Flame className="inline h-4 w-4 -mt-0.5 mr-0.5" />}
                {s.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Profile Info">
          <div className="space-y-2 text-sm">
            {[
              ["Phone", user.phone],
              ["Gender", user.gender ? genderLabel[user.gender] : null],
              ["Date of Birth", user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("id-ID") : null],
              ["Domisili", user.domisili],
              ["Pendidikan", user.pendidikan ? (pendidikanLabel[user.pendidikan] ?? user.pendidikan) : null],
              ["GitHub", user.githubUsername],
              ["Learning Style", user.learningStyle?.replace(/_/g, " ")],
              ["Guidance", user.guidancePreference?.replace(/_/g, " ")],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between py-0.5">
                <span className="text-gray-500 text-xs">{label}</span>
                <span className="text-gray-900 font-medium text-xs text-right max-w-[55%] truncate">
                  {value ?? <span className="text-gray-300 font-normal">—</span>}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Credit Usage (14 days)">
          {debitTransactions14d.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Belum ada debit credit.</p>
          ) : (
            <div className="space-y-2.5">
              {dailyCreditUsage.map((usage) => (
                <div key={usage.date.toISOString()} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 w-16 shrink-0">
                    {usage.date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500"
                      style={{ width: `${Math.min((usage.amount / maxCreditUsage) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 w-8 text-right tabular-nums">
                    {usage.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Credit Summary">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Balance", value: creditSummary.balance.toLocaleString("id-ID"), icon: Coins, color: "text-emerald-600" },
              { label: "Top-up", value: creditSummary.totalTopupCredits.toLocaleString("id-ID"), icon: Wallet, color: "text-blue-600" },
              { label: "Spent", value: creditSummary.totalSpentCredits.toLocaleString("id-ID"), icon: ReceiptText, color: "text-orange-600" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-gray-50 px-2 py-3">
                <item.icon className={cn("mx-auto h-4 w-4", item.color)} />
                <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={`Bundle Purchases (${user.bundlePurchases.length})`}>
          {user.bundlePurchases.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada bundle purchase.</p>
          ) : (
            <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto">
              {user.bundlePurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{purchase.track.title}</p>
                    <p className="text-xs text-gray-400">{fmtDate(purchase.purchasedAt)}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    <PackageCheck className="h-3 w-3" />
                    {purchase.amountPaidIdr.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent Credit Transactions" noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Action / Ref</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Amount</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditSummary.recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada transaksi credit.</td>
                </tr>
              )}
              {creditSummary.recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-xs text-gray-500">{fmtDate(tx.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{tx.type}</span>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-2.5 text-xs text-gray-500">{tx.action ?? tx.refId ?? "—"}</td>
                  <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", tx.type === CreditTxType.DEBIT ? "text-red-500" : "text-emerald-600")}>
                    {tx.type === CreditTxType.DEBIT ? "-" : "+"}{tx.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums text-gray-900">{tx.balanceAfter.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title={`Curricula (${user.curricula.length})`}>
        {user.curricula.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada kurikulum.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {user.curricula.map((c) => {
              const totalTopics = c.modules.reduce((s, m) => s + m.topics.length, 0)
              const passedTopics = c.modules.reduce(
                (s, m) => s + m.topics.filter((t) => passedSet.has(t.id)).length,
                0
              )
              const pct = totalTopics > 0 ? Math.round((passedTopics / totalTopics) * 100) : 0
              const done = pct === 100
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                  <span className="text-lg shrink-0">{c.icon ?? "📚"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div
                          className={cn("h-1 rounded-full", done ? "bg-emerald-500" : "bg-blue-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                        {passedTopics}/{totalTopics}
                      </span>
                    </div>
                  </div>
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-gray-200 shrink-0" />
                  }
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
