import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { isAdmin } from "@kodevo/auth/admin"
import { sendPremiumWelcomeEmail } from "@kodevo/email"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!await isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { id } = await params
  const { tier } = await req.json() as { tier: "free" | "plus" | "pro" }

  const data =
    tier === "pro"
      ? { isPremium: true, isPro: true }
      : tier === "plus"
      ? { isPremium: true, isPro: false }
      : { isPremium: false, isPro: false }

  const updated = await db.user.update({ where: { id }, data, select: { email: true, name: true } })
  if ((tier === "plus" || tier === "pro") && updated.email) {
    sendPremiumWelcomeEmail(updated.email, updated.name ?? "Kamu").catch(() => {})
  }
  return NextResponse.json({ ok: true, tier })
}
