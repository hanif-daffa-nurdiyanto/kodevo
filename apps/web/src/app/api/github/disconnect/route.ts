import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  await db.user.update({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    data: { githubAccessToken: null },
  })

  return NextResponse.json({ ok: true })
}
