import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    select: { githubAccessToken: true },
  })

  if (!dbUser?.githubAccessToken) return NextResponse.json({ user: null })

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${dbUser.githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      // Token expired — clear it
      await db.user.update({
        where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
        data: { githubAccessToken: null },
      })
    }
    return NextResponse.json({ user: null })
  }

  const data = await res.json()
  return NextResponse.json({
    user: {
      login: data.login,
      name: data.name ?? null,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      public_repos: data.public_repos,
    },
  })
}
