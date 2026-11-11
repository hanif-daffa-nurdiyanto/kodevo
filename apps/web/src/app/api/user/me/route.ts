import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, name: true, email: true, image: true, level: true, isPremium: true, isPro: true },
      })
    : sessionUser.email
    ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, name: true, email: true, image: true, level: true, isPremium: true, isPro: true },
      })
    : null

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  return NextResponse.json({ user: dbUser })
}
