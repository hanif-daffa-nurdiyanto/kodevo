import { NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    select: { isPro: true, githubAccessToken: true },
  })

  if (!dbUser?.isPro) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  if (!dbUser.githubAccessToken) return NextResponse.json({ error: "GitHub belum terhubung." }, { status: 400 })

  const res = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner", {
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
      return NextResponse.json({ error: "Token GitHub kedaluwarsa. Hubungkan ulang." }, { status: 401 })
    }
    return NextResponse.json({ error: "Gagal mengambil daftar repo." }, { status: 502 })
  }

  const repos = await res.json()
  return NextResponse.json(
    repos.map((r: { id: number; full_name: string; name: string; default_branch: string; private: boolean }) => ({
      id: r.id,
      fullName: r.full_name,
      name: r.name,
      defaultBranch: r.default_branch,
      private: r.private,
    }))
  )
}
