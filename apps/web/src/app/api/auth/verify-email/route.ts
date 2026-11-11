import { NextRequest, NextResponse } from "next/server"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const identifier = searchParams.get("identifier")

  if (!token || !identifier) {
    redirect("/login?error=invalid-link")
  }

  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  })

  if (!record || record.expires < new Date()) {
    redirect("/login?error=expired-link")
  }

  const email = identifier.replace("verify:", "")
  await db.$transaction([
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    db.verificationToken.delete({ where: { identifier_token: { identifier, token } } }),
  ])

  redirect("/dashboard?verified=1")
}
