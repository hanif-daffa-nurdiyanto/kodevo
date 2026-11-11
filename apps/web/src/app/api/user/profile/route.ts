import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT"]).optional().nullable(),
  domisili: z.string().max(100).optional().nullable(),
  pendidikan: z.string().max(100).optional().nullable(),
  githubUsername: z.string().max(100).optional().nullable(),
  learningStyle: z.enum(["READ_FIRST", "CHUNK_QUIZ", "CHALLENGE_FIRST"]).optional().nullable(),
  guidancePreference: z.enum(["GUIDED", "SEMI_GUIDED", "INDEPENDENT"]).optional().nullable(),
  isProfilePublic: z.boolean().optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 })

  const sessionUser = session.user as any
  const userId = sessionUser.id

  const { dateOfBirth, ...rest } = body.data

  await db.user.update({
    where: { id: userId },
    data: {
      ...rest,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : dateOfBirth === null ? null : undefined,
    },
  })

  return NextResponse.json({ success: true })
}
