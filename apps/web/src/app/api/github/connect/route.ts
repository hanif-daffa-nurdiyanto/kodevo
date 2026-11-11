import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { cookies } from "next/headers"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url))

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/settings/github"

  const state = crypto.randomBytes(16).toString("hex")
  const cookieStore = await cookies()
  cookieStore.set("github_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  cookieStore.set("github_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`,
    scope: "repo",
    state,
  })

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
