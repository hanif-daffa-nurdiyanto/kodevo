import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const exerciseId = req.nextUrl.searchParams.get("exerciseId")
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 })

  const submissions = await db.testSubmission.findMany({
    where: { userId: dbUser.id, exerciseId },
    orderBy: { submittedAt: "desc" },
  })

  return NextResponse.json({ submissions })
}

// GitHub-based submission — reserved for advanced tracks, not yet implemented
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "GitHub submission not yet enabled" }, { status: 501 })
}
