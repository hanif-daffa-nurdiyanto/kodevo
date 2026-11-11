import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const repo = searchParams.get("repo") // e.g. "owner/repo"
  const path = searchParams.get("path") // e.g. "src/index.js"
  const branch = searchParams.get("branch") ?? "main"

  if (!repo || !path) return NextResponse.json({ error: "repo dan path wajib diisi." }, { status: 400 })

  const sessionUser = session.user as any
  const dbUser = await db.user.findUnique({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    select: { isPro: true, githubAccessToken: true },
  })

  if (!dbUser?.isPro) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  if (!dbUser.githubAccessToken) return NextResponse.json({ error: "GitHub belum terhubung." }, { status: 400 })

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${dbUser.githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  )

  if (!res.ok) {
    if (res.status === 404) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 })
    if (res.status === 401) return NextResponse.json({ error: "Token GitHub kedaluwarsa. Hubungkan ulang." }, { status: 401 })
    return NextResponse.json({ error: "Gagal mengambil file." }, { status: 502 })
  }

  const data = await res.json()

  // GitHub returns base64-encoded content
  if (data.type !== "file") return NextResponse.json({ error: "Path yang dipilih bukan file." }, { status: 400 })
  if (data.size > 100000) return NextResponse.json({ error: "File terlalu besar (max 100KB)." }, { status: 413 })

  const content = Buffer.from(data.content, "base64").toString("utf-8")
  return NextResponse.json({ content, name: data.name, sha: data.sha })
}
