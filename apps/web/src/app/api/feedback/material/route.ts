import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  topicId: z.string().min(1),
  type: z.enum(["WRONG_CONTENT", "TYPO", "TOO_EASY", "TOO_HARD", "OTHER"]),
  message: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: "Input tidak valid" }, { status: 400 })

  const { topicId, type, message } = body.data

  const topic = await db.topic.findUnique({ where: { id: topicId }, select: { id: true } })
  if (!topic) return NextResponse.json({ error: "Topic tidak ditemukan" }, { status: 404 })

  await db.materialFeedback.create({
    data: { topicId, userId: dbUser.id, type, message: message ?? null },
  })

  return NextResponse.json({ ok: true })
}
