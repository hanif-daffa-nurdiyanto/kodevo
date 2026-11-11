import { NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"

export async function GET() {
  await requireAdmin()

  const [creditTransactions, bundlePurchases, bundleTracks, creditSummary] = await Promise.all([
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
    db.track.findMany({
      where: { type: TrackType.BUNDLE },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      include: {
        _count: { select: { modules: true, purchases: true } },
      },
    }),
    db.creditBalance.aggregate({
      _sum: { balance: true },
      _count: { userId: true },
    }),
  ])

  return NextResponse.json({
    creditTransactions,
    bundlePurchases,
    bundleTracks,
    summary: {
      totalCreditBalance: creditSummary._sum.balance ?? 0,
      usersWithCredit: creditSummary._count.userId,
    },
  })
}
