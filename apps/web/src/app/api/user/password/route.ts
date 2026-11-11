import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, password: true },
  })

  if (!dbUser?.password) {
    return NextResponse.json({ error: "Akun ini menggunakan login sosial, tidak bisa ganti password" }, { status: 400 })
  }

  const valid = await bcrypt.compare(body.data.currentPassword, dbUser.password)
  if (!valid) return NextResponse.json({ error: "Password lama salah" }, { status: 400 })

  const hashed = await bcrypt.hash(body.data.newPassword, 12)
  await db.user.update({ where: { id: dbUser.id }, data: { password: hashed } })

  return NextResponse.json({ success: true })
}
