import { auth } from "./server"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login?callbackUrl=/")

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) redirect("/dashboard")

  return session
}

export async function isAdmin(email: string | null | undefined) {
  if (!email) return false
  const user = await db.user.findUnique({ where: { email }, select: { isAdmin: true } })
  return user?.isAdmin ?? false
}

export function fmtNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n)
}
