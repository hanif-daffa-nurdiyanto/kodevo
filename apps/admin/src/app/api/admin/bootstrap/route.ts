import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

// One-time endpoint to promote the first admin.
// Disabled automatically once any admin exists.
// Requires ADMIN_BOOTSTRAP_SECRET env var to match.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Login dulu" }, { status: 401 })
  }

  const secret = process.env.ADMIN_BOOTSTRAP_SECRET
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_BOOTSTRAP_SECRET tidak dikonfigurasi" }, { status: 403 })
  }

  const { secret: provided } = await req.json().catch(() => ({}))
  if (provided !== secret) {
    return NextResponse.json({ error: "Secret salah" }, { status: 403 })
  }

  // Block if admin already exists — endpoint is one-time only
  const existingAdmin = await db.user.findFirst({ where: { isAdmin: true } })
  if (existingAdmin) {
    return NextResponse.json({ error: "Admin sudah ada. Endpoint ini sudah tidak aktif." }, { status: 403 })
  }

  await db.user.update({
    where: { email: session.user.email },
    data: { isAdmin: true },
  })

  return NextResponse.json({ ok: true, message: `${session.user.email} sekarang adalah admin` })
}
