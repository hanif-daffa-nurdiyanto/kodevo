import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@kodevo/db"
import { generateUniqueUsername, isValidUsername } from "@kodevo/auth/username"
import { sendWelcomeEmail, sendEmailVerificationEmail } from "@kodevo/email"
import crypto from "crypto"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).optional(),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 })
  }

  const { name, email, password } = body.data
  const requestedUsername = body.data.username?.toLowerCase()

  try {
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 })
    }

    if (requestedUsername && !isValidUsername(requestedUsername)) {
      return NextResponse.json({ error: "Format username tidak valid." }, { status: 400 })
    }

    if (requestedUsername) {
      const usernameOwner = await db.user.findUnique({ where: { username: requestedUsername }, select: { id: true } })
      if (usernameOwner) {
        return NextResponse.json({ error: "Username sudah dipakai." }, { status: 409 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const username = requestedUsername ?? await generateUniqueUsername(name)

    await db.user.create({
      data: { name, email, password: hashedPassword, username },
    })

    sendWelcomeEmail(email, name).catch(() => {})

    // Send email verification link
    const verifyToken = crypto.randomBytes(32).toString("hex")
    const identifier = `verify:${email}`
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    await db.verificationToken.create({ data: { identifier, token: verifyToken, expires } })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verifyToken}&identifier=${encodeURIComponent(identifier)}`
    sendEmailVerificationEmail(email, name, verifyUrl).catch(() => {})

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("[register]", err)
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 })
  }
}
