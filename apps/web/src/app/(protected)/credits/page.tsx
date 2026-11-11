import { redirect } from "next/navigation"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { CreditsSection } from "./credits-section"

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const userId = sessionUser.id
  if (!userId) redirect("/login")

  const [dbUser, creditBalance, packages, transactions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    db.creditBalance.findUnique({ where: { userId }, select: { balance: true } }),
    db.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { credits: "asc" }],
      select: { id: true, label: true, description: true, credits: true, priceIdr: true },
    }),
    db.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        action: true,
        createdAt: true,
      },
    }),
  ])

  if (!dbUser) redirect("/login")

  const params = await searchParams
  const activeTab = params.tab === "history" ? "history" : "packages"

  return (
    <div className="mx-auto max-w-[920px] px-4 py-10 md:px-6">
      <div className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight">Credits</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola saldo, top-up, dan riwayat penggunaan credit.</p>
      </div>

      <CreditsSection
        name={dbUser.name}
        email={dbUser.email}
        upgraded={params.payment === "done"}
        creditBalance={creditBalance?.balance ?? 0}
        activeTab={activeTab}
        packages={packages}
        transactions={transactions.map((transaction) => ({
          ...transaction,
          createdAt: transaction.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
