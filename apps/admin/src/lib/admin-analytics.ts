import { CreditTxType, db, getCreditPricing } from "@kodevo/db"

type AnalyticsClient = Pick<
  typeof db,
  "bundlePurchase" | "creditBalance" | "creditTransaction" | "creditPackage" | "track" | "user"
>

export type AnalyticsDateRange = {
  from?: Date
  to?: Date
}

export type PaidUserSource = "bundle" | "credit_topup" | "both"

export type PaidUserIndex = {
  userIds: string[]
  sourceByUserId: Map<string, PaidUserSource>
}

function rangeWhere(range?: AnalyticsDateRange) {
  if (!range?.from && !range?.to) return undefined
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lt: range.to } : {}),
  }
}

export async function getPaidUserIndex(client: AnalyticsClient = db): Promise<PaidUserIndex> {
  const [bundleUsers, topupUsers] = await Promise.all([
    client.bundlePurchase.groupBy({ by: ["userId"] }),
    client.creditTransaction.groupBy({
      by: ["userId"],
      where: { type: CreditTxType.TOPUP },
    }),
  ])

  const bundleUserIds = new Set(bundleUsers.map((row) => row.userId))
  const topupUserIds = new Set(topupUsers.map((row) => row.userId))
  const userIds = Array.from(new Set([...bundleUserIds, ...topupUserIds]))
  const sourceByUserId = new Map<string, PaidUserSource>()

  for (const userId of userIds) {
    const hasBundle = bundleUserIds.has(userId)
    const hasTopup = topupUserIds.has(userId)
    sourceByUserId.set(userId, hasBundle && hasTopup ? "both" : hasBundle ? "bundle" : "credit_topup")
  }

  return { userIds, sourceByUserId }
}

export async function getPaidUserIds(client: AnalyticsClient = db): Promise<string[]> {
  return (await getPaidUserIndex(client)).userIds
}

export async function getUserCreditSummary(
  userId: string,
  client: AnalyticsClient = db
) {
  const [balance, topup, debit, recentTransactions] = await Promise.all([
    client.creditBalance.findUnique({ where: { userId } }),
    client.creditTransaction.aggregate({
      where: { userId, type: CreditTxType.TOPUP },
      _sum: { amount: true },
      _count: { id: true },
    }),
    client.creditTransaction.aggregate({
      where: { userId, type: CreditTxType.DEBIT },
      _sum: { amount: true },
      _count: { id: true },
    }),
    client.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return {
    balance: balance?.balance ?? 0,
    totalTopupCredits: topup._sum.amount ?? 0,
    totalSpentCredits: debit._sum.amount ?? 0,
    topupCount: topup._count.id,
    debitCount: debit._count.id,
    recentTransactions,
  }
}

export async function getRevenueSummary(
  range?: AnalyticsDateRange,
  client: AnalyticsClient = db
) {
  const topupCreatedAt = rangeWhere(range)
  const bundlePurchasedAt = rangeWhere(range)
  const [pricing, topup, bundle, outstandingCredit] = await Promise.all([
    getCreditPricing(),
    client.creditTransaction.aggregate({
      where: { type: CreditTxType.TOPUP, ...(topupCreatedAt ? { createdAt: topupCreatedAt } : {}) },
      _sum: { amount: true },
      _count: { id: true },
    }),
    client.bundlePurchase.aggregate({
      where: bundlePurchasedAt ? { purchasedAt: bundlePurchasedAt } : undefined,
      _sum: { amountPaidIdr: true },
      _count: { id: true },
    }),
    client.creditBalance.aggregate({
      _sum: { balance: true },
      _count: { userId: true },
    }),
  ])

  const topupCredits = topup._sum.amount ?? 0
  const estimatedTopupRevenueIdr = topupCredits * pricing.credit_price_idr
  const bundleRevenueIdr = bundle._sum.amountPaidIdr ?? 0

  return {
    topupCredits,
    topupCount: topup._count.id,
    estimatedTopupRevenueIdr,
    bundleRevenueIdr,
    bundlePurchaseCount: bundle._count.id,
    estimatedTotalRevenueIdr: estimatedTopupRevenueIdr + bundleRevenueIdr,
    outstandingCredits: outstandingCredit._sum.balance ?? 0,
    usersWithCreditBalance: outstandingCredit._count.userId,
  }
}

export async function getBundleBuyerSummary(
  range?: AnalyticsDateRange,
  client: AnalyticsClient = db
) {
  const purchasedAt = rangeWhere(range)
  const [summary, grouped] = await Promise.all([
    client.bundlePurchase.aggregate({
      where: purchasedAt ? { purchasedAt } : undefined,
      _sum: { amountPaidIdr: true },
      _count: { id: true },
    }),
    client.bundlePurchase.groupBy({
      by: ["trackId"],
      where: purchasedAt ? { purchasedAt } : undefined,
      _sum: { amountPaidIdr: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ])

  const tracks = await client.track.findMany({
    where: { id: { in: grouped.map((row) => row.trackId) } },
    select: { id: true, title: true, slug: true, priceIdr: true },
  })
  const trackById = new Map(tracks.map((track) => [track.id, track]))

  return {
    purchaseCount: summary._count.id,
    revenueIdr: summary._sum.amountPaidIdr ?? 0,
    topBundles: grouped.map((row) => ({
      trackId: row.trackId,
      track: trackById.get(row.trackId) ?? null,
      purchaseCount: row._count.id,
      revenueIdr: row._sum.amountPaidIdr ?? 0,
    })),
  }
}

export async function getCreditUsageSummary(
  range?: AnalyticsDateRange,
  client: AnalyticsClient = db
) {
  const createdAt = rangeWhere(range)
  const where = {
    type: CreditTxType.DEBIT,
    ...(createdAt ? { createdAt } : {}),
  }

  const [summary, byAction, topSpenders] = await Promise.all([
    client.creditTransaction.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    client.creditTransaction.groupBy({
      by: ["action"],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    client.creditTransaction.groupBy({
      by: ["userId"],
      where,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
  ])

  const users = await client.user.findMany({
    where: { id: { in: topSpenders.map((row) => row.userId) } },
    select: { id: true, name: true, email: true },
  })
  const userById = new Map(users.map((user) => [user.id, user]))

  return {
    spentCredits: summary._sum.amount ?? 0,
    debitCount: summary._count.id,
    byAction: byAction.map((row) => ({
      action: row.action ?? "unknown",
      spentCredits: row._sum.amount ?? 0,
      debitCount: row._count.id,
    })),
    topSpenders: topSpenders.map((row) => ({
      userId: row.userId,
      user: userById.get(row.userId) ?? null,
      spentCredits: row._sum.amount ?? 0,
      debitCount: row._count.id,
    })),
  }
}
