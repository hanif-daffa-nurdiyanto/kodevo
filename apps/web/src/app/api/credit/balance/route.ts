import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const balance = await db.creditBalance.findUnique({ where: { userId: dbUser.id } })
  return NextResponse.json({ balance: balance?.balance ?? 0, updatedAt: balance?.updatedAt ?? null })
}
