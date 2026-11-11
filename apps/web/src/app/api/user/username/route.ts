import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { isValidUsername } from "@kodevo/auth/username"
import { z } from "zod"

const schema = z.object({
  username: z
    .string()
    .min(3, "Minimal 3 karakter")
    .max(30, "Maksimal 30 karakter")
    .regex(/^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]{3,}$/, "Hanya huruf kecil, angka, underscore, dan dash"),
})

// GET /api/user/username?q=someusername — check availability
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase()
  if (!q) return NextResponse.json({ available: false })

  if (!isValidUsername(q)) return NextResponse.json({ available: false, error: "Format tidak valid" })

  const session = await auth()
  const sessionUser = session?.user as any
  const existing = await db.user.findUnique({ where: { username: q }, select: { id: true } })

  // Available if not taken, or taken by current user
  const available = !existing || existing.id === sessionUser?.id
  return NextResponse.json({ available })
}

// PUT /api/user/username — update username
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 })

  const username = body.data.username.toLowerCase()
  const sessionUser = session.user as any

  const existing = await db.user.findUnique({ where: { username }, select: { id: true } })
  if (existing && existing.id !== sessionUser.id) {
    return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 })
  }

  await db.user.update({ where: { id: sessionUser.id }, data: { username } })
  return NextResponse.json({ success: true, username })
}
