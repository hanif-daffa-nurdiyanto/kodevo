import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { Level } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  requestedLevel: z.enum(["BEGINNER", "MID", "ADVANCE"]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const screening = await db.screeningResult.findUnique({
    where: { userId: session.user.id },
  })

  if (!screening) {
    return NextResponse.json({ error: "No screening found" }, { status: 404 })
  }

  if (screening.appealUsed) {
    return NextResponse.json({ error: "Appeal already used" }, { status: 409 })
  }

  const newLevel = body.data.requestedLevel as Level

  await db.$transaction([
    db.screeningResult.update({
      where: { userId: session.user.id },
      data: { level: newLevel, appealUsed: true },
    }),
    db.user.update({
      where: { id: session.user.id },
      data: { level: newLevel },
    }),
  ])

  return NextResponse.json({ level: newLevel })
}
