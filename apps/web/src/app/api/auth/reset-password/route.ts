import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 })

  const { token, password } = body.data

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } })
  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json({ error: "Link reset tidak valid atau sudah kedaluwarsa." }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: resetToken.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 })

  const hashed = await bcrypt.hash(password, 12)
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { password: hashed } }),
    db.passwordResetToken.delete({ where: { token } }),
  ])

  return NextResponse.json({ ok: true })
}
