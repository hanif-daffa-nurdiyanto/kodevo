// Next.js 16: proxy.ts replaces middleware.ts
import NextAuth from "next-auth"
import { authConfig } from "@kodevo/auth/config"

const { auth } = NextAuth(authConfig)

export function proxy(...args: Parameters<typeof auth>) {
  return auth(...args)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
