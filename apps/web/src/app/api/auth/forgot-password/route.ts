import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { sendPasswordResetEmail } from "@kodevo/email"
import { z } from "zod"
import crypto from "crypto"

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 })

  const { email } = body.data

  // Always return 200 so we don't leak whether an email is registered
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, password: true } })
  if (!user?.password) {
    // No credentials account (OAuth only) or not found — silently succeed
    return NextResponse.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.deleteMany({ where: { email } })
  await db.passwordResetToken.create({ data: { email, token, expires } })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`
  sendPasswordResetEmail(email, user.name ?? "Pengguna", resetUrl).catch(() => {})

  return NextResponse.json({ ok: true })
}
