import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url))

  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const cookieStore = await cookies()
  const savedState = cookieStore.get("github_oauth_state")?.value
  const returnTo  = cookieStore.get("github_oauth_return_to")?.value ?? "/settings/github"
  cookieStore.delete("github_oauth_state")
  cookieStore.delete("github_oauth_return_to")

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL(`${returnTo}?github_error=invalid_state`, req.url))
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`,
    }),
  })

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token as string | undefined

  if (!accessToken) {
    return NextResponse.redirect(new URL(`${returnTo}?github_error=token_failed`, req.url))
  }

  // Store token in DB
  const sessionUser = session.user as any
  await db.user.update({
    where: sessionUser.id ? { id: sessionUser.id } : { email: sessionUser.email! },
    data: { githubAccessToken: accessToken },
  })

  return NextResponse.redirect(new URL(`${returnTo}?github_connected=1`, req.url))
}
