import { CreditTxType, db } from "@kodevo/db"
import { requireAdmin } from "@kodevo/auth/admin"
import Link from "next/link"
import { AlertTriangle, BadgeCheck, Coins, Flame, PackageCheck, TrendingUp, UserX } from "lucide-react"
import { getPaidUserIndex } from "@/lib/admin-analytics"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"

type UserRow = {
  id: string
  name: string | null
  email: string
  xp: number
  streaks: { date: Date }[]
  creditBalance?: { balance: number } | null
  bundlePurchases?: { purchasedAt: Date; track: { title: string } }[]
  creditTransactions?: { createdAt: Date; type: string }[]
  _count: { topicQuizzes: number; bundlePurchases?: number }
}

function Initial({ name }: { name: string | null }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
      {name?.slice(0, 2).toUpperCase() ?? "??"}
    </div>
  )
}

function daysAgo(now: Date, date: Date | string | undefined | null) {
  if (!date) return "—"
  const diff = Math.round((now.getTime() - new Date(date).getTime()) / 86400000)
  return diff === 0 ? "hari ini" : `${diff}h lalu`
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime())
  let streak = 1
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (sorted[i].getTime() - sorted[i + 1].getTime()) / 86400000
    if (diff <= 1.5) streak++
    else break
  }
  return streak
}

function UserIdentity({ user, badge }: { user: Pick<UserRow, "id" | "name" | "email">; badge?: React.ReactNode }) {
  return (
    <Link href={`/users/${user.id}`} className="flex min-w-0 items-center gap-2.5">
      <Initial name={user.name} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-gray-900">{user.name ?? "—"}</p>
          {badge}
        </div>
        <p className="truncate text-xs text-gray-400">{user.email}</p>
      </div>
    </Link>
  )
}

function UserTable({
  users,
  now,
  empty,
  columns,
}: {
  users: UserRow[]
  now: Date
  empty: string
  columns: Array<{
    label: string
    render: (user: UserRow) => React.ReactNode
  }>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[680px] w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">User</th>
            {columns.map((column) => (
              <th key={column.label} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="py-8 text-center text-sm text-gray-400">{empty}</td>
            </tr>
          )}
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3">
                <UserIdentity user={user} />
              </td>
              {columns.map((column) => (
                <td key={column.label} className="px-4 py-3 text-right text-xs text-gray-500">
                  {column.render(user)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function StudioAtRiskPage() {
  await requireAdmin()

  const now = new Date()
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3); threeDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7); sevenDaysAgo.setHours(0, 0, 0, 0)
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 14); fourteenDaysAgo.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0)
  const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60); sixtyDaysAgo.setHours(0, 0, 0, 0)

  const paidUsers = await getPaidUserIndex()
  const paidUserIds = paidUsers.userIds
  const paidUserIdSet = new Set(paidUserIds)

  const [recentlyActiveRows, active7to30Rows, active30to60Rows, engagedRows] = await Promise.all([
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: sevenDaysAgo } } }),
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: thirtyDaysAgo, lt: sevenDaysAgo } } }),
    db.streak.groupBy({ by: ["userId"], where: { date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    db.topicQuiz.groupBy({ by: ["userId"] }),
  ])

  const recentlyActiveIds = new Set(recentlyActiveRows.map((row) => row.userId))
  const previouslyActive7to30 = active7to30Rows.map((row) => row.userId).filter((id) => !recentlyActiveIds.has(id))
  const previouslyActive30to60 = active30to60Rows
    .map((row) => row.userId)
    .filter((id) => !recentlyActiveIds.has(id) && !previouslyActive7to30.includes(id))
  const dormant7to60 = Array.from(new Set(previouslyActive7to30.concat(previouslyActive30to60)))
  const engagedNeverPurchasedIds = engagedRows.map((row) => row.userId).filter((id) => !paidUserIdSet.has(id))

  const streakBreakerIds = await db.streak
    .groupBy({ by: ["userId"], where: { date: { gte: fourteenDaysAgo, lt: threeDaysAgo } } })
    .then((rows) => rows.map((row) => row.userId).filter((id) => !recentlyActiveIds.has(id)))

  const [
    paidAtRisk,
    bundleAtRisk,
    lowCreditActiveUsers,
    engagedNeverPurchased,
    winBackBuyers,
    streakBreakers,
  ] = await Promise.all([
    db.user.findMany({
      where: { id: { in: dormant7to60.filter((id) => paidUserIdSet.has(id)) } },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        creditBalance: { select: { balance: true } },
        _count: { select: { topicQuizzes: true, bundlePurchases: true } },
      },
      orderBy: { xp: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: {
        bundlePurchases: { some: {} },
        OR: [
          { id: { in: dormant7to60 } },
          { topicQuizzes: { none: {} } },
        ],
      },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        bundlePurchases: {
          orderBy: { purchasedAt: "desc" },
          take: 1,
          select: { purchasedAt: true, track: { select: { title: true } } },
        },
        _count: { select: { topicQuizzes: true, bundlePurchases: true } },
      },
      orderBy: { xp: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: {
        id: { in: Array.from(recentlyActiveIds) },
        creditBalance: { is: { balance: { gt: 0, lte: 100 } } },
      },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        creditBalance: { select: { balance: true } },
        creditTransactions: {
          where: { type: CreditTxType.DEBIT },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, type: true },
        },
        _count: { select: { topicQuizzes: true } },
      },
      orderBy: { xp: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: { id: { in: engagedNeverPurchasedIds }, createdAt: { lte: fourteenDaysAgo } },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        _count: { select: { topicQuizzes: true } },
      },
      orderBy: { xp: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: { id: { in: dormant7to60.filter((id) => paidUserIdSet.has(id)) } },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        creditBalance: { select: { balance: true } },
        bundlePurchases: {
          orderBy: { purchasedAt: "desc" },
          take: 1,
          select: { purchasedAt: true, track: { select: { title: true } } },
        },
        _count: { select: { topicQuizzes: true, bundlePurchases: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.user.findMany({
      where: { id: { in: streakBreakerIds.slice(0, 80) } },
      include: {
        streaks: { orderBy: { date: "desc" }, take: 30, select: { date: true } },
        _count: { select: { topicQuizzes: true } },
      },
      orderBy: { xp: "desc" },
      take: 20,
    }),
  ])

  return (
    <div>
      <PageHeader
        title="At-Risk Users"
        description="Paid, bundle, low-credit, dan engaged users yang perlu perhatian."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <StatCard
          label="Paid At-Risk"
          value={paidAtRisk.length.toString()}
          sub="pernah beli, dormant 7+ hari"
          icon={BadgeCheck}
          trend="down"
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <StatCard
          label="Bundle At-Risk"
          value={bundleAtRisk.length.toString()}
          sub="bundle buyer progress rendah"
          icon={PackageCheck}
          trend="down"
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Low Credit Active"
          value={lowCreditActiveUsers.length.toString()}
          sub="aktif, saldo <=100"
          icon={Coins}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatCard
          label="Engaged Not Bought"
          value={engagedNeverPurchased.length.toString()}
          sub="belajar tapi belum purchase"
          icon={TrendingUp}
          trend="up"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Win-Back Buyers"
          value={winBackBuyers.length.toString()}
          sub="paid dormant 7-60 hari"
          icon={UserX}
          iconColor="text-slate-600"
          iconBg="bg-slate-50"
        />
      </div>

      <SectionCard
        title={`Paid At-Risk (${paidAtRisk.length})`}
        description="User yang pernah top-up atau beli bundle, tetapi tidak aktif lagi 7+ hari."
        className="mb-4"
        noPadding
      >
        <UserTable
          users={paidAtRisk}
          now={now}
          empty="Tidak ada paid user at-risk saat ini."
          columns={[
            { label: "XP", render: (user) => <span className="font-medium text-gray-900 tabular-nums">{user.xp.toLocaleString("id-ID")}</span> },
            { label: "Credit", render: (user) => <span className="tabular-nums">{(user.creditBalance?.balance ?? 0).toLocaleString("id-ID")}</span> },
            { label: "Bundles", render: (user) => <span className="tabular-nums">{user._count.bundlePurchases ?? 0}</span> },
            { label: "Last Active", render: (user) => <span className="font-medium text-red-500">{daysAgo(now, user.streaks[0]?.date)}</span> },
          ]}
        />
      </SectionCard>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={`Bundle At-Risk (${bundleAtRisk.length})`}
          description="Bundle buyer yang dormant atau belum punya progress quiz."
          noPadding
        >
          <UserTable
            users={bundleAtRisk}
            now={now}
            empty="Tidak ada bundle buyer at-risk."
            columns={[
              { label: "Bundle", render: (user) => <span className="inline-block max-w-[160px] truncate">{user.bundlePurchases?.[0]?.track.title ?? "—"}</span> },
              { label: "Topics", render: (user) => <span className="tabular-nums">{user._count.topicQuizzes}</span> },
              { label: "Last Active", render: (user) => <span>{daysAgo(now, user.streaks[0]?.date)}</span> },
            ]}
          />
        </SectionCard>

        <SectionCard
          title={`Low Credit Active Users (${lowCreditActiveUsers.length})`}
          description="User aktif yang kemungkinan perlu diingatkan top-up."
          noPadding
        >
          <UserTable
            users={lowCreditActiveUsers}
            now={now}
            empty="Tidak ada active user dengan saldo rendah."
            columns={[
              { label: "Credit", render: (user) => <span className="font-semibold text-orange-600 tabular-nums">{(user.creditBalance?.balance ?? 0).toLocaleString("id-ID")}</span> },
              { label: "Topics", render: (user) => <span className="tabular-nums">{user._count.topicQuizzes}</span> },
              { label: "Last Active", render: (user) => <span>{daysAgo(now, user.streaks[0]?.date)}</span> },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={`Engaged Never Purchased (${engagedNeverPurchased.length})`}
          description="User sudah belajar tetapi belum pernah top-up atau beli bundle."
          noPadding
        >
          <UserTable
            users={engagedNeverPurchased}
            now={now}
            empty="Tidak ada engaged user yang belum purchase."
            columns={[
              { label: "XP", render: (user) => <span className="font-medium text-gray-900 tabular-nums">{user.xp.toLocaleString("id-ID")}</span> },
              { label: "Topics", render: (user) => <span className="tabular-nums">{user._count.topicQuizzes}</span> },
              { label: "Last Active", render: (user) => <span>{daysAgo(now, user.streaks[0]?.date)}</span> },
            ]}
          />
        </SectionCard>

        <SectionCard
          title={`Win-Back Buyers (${winBackBuyers.length})`}
          description="Paid user yang dormant 7-60 hari, cocok untuk re-engagement."
          noPadding
        >
          <UserTable
            users={winBackBuyers}
            now={now}
            empty="Tidak ada buyer untuk win-back saat ini."
            columns={[
              { label: "Credit", render: (user) => <span className="tabular-nums">{(user.creditBalance?.balance ?? 0).toLocaleString("id-ID")}</span> },
              { label: "Bundles", render: (user) => <span className="tabular-nums">{user._count.bundlePurchases ?? 0}</span> },
              { label: "Last Active", render: (user) => <span>{daysAgo(now, user.streaks[0]?.date)}</span> },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard
        title={`Streak Breakers (${Math.min(streakBreakers.length, 20)} ditampilkan dari ${streakBreakerIds.length})`}
        description="User yang baru-baru ini aktif setiap hari lalu berhenti."
        noPadding
      >
        <UserTable
          users={streakBreakers}
          now={now}
          empty="Tidak ada streak breaker saat ini."
          columns={[
            { label: "XP", render: (user) => <span className="font-medium text-gray-900 tabular-nums">{user.xp.toLocaleString("id-ID")}</span> },
            { label: "Streak", render: (user) => <span className="font-semibold text-orange-500"><Flame className="mr-1 inline h-3 w-3" />{computeStreak(user.streaks.map((streak) => streak.date))}</span> },
            { label: "Last Active", render: (user) => <span className="font-medium text-amber-600">{daysAgo(now, user.streaks[0]?.date)}</span> },
          ]}
        />
      </SectionCard>

      <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Bundle at-risk masih memakai proxy: dormant activity atau belum ada quiz progress. Nanti bisa dibuat lebih presisi dengan helper progress per bundle track.
          </p>
        </div>
      </div>
    </div>
  )
}
