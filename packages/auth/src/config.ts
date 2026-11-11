import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

const authCookieNamespace = process.env.AUTH_COOKIE_NAMESPACE ?? "web"
const authCookiePrefix = `kodevo.${authCookieNamespace}.authjs`

// Edge-safe config — no Prisma here
export const authConfig: NextAuthConfig = {
  cookies: {
    sessionToken: {
      name: `${authCookiePrefix}.session-token`,
    },
    callbackUrl: {
      name: `${authCookiePrefix}.callback-url`,
    },
    csrfToken: {
      name: `${authCookiePrefix}.csrf-token`,
    },
    pkceCodeVerifier: {
      name: `${authCookiePrefix}.pkce.code-verifier`,
    },
    state: {
      name: `${authCookiePrefix}.state`,
    },
    nonce: {
      name: `${authCookiePrefix}.nonce`,
    },
    webauthnChallenge: {
      name: `${authCookiePrefix}.challenge`,
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsed.success) return null

        // Actual DB check is done in auth.ts via signIn callback
        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/learn") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/screening")

      if (isProtected && !isLoggedIn) return false
      return true
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.level = (user as any).level
        token.isPremium = (user as any).isPremium
      }
      if (trigger === "update" && session?.level) {
        token.level = session.level
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id ?? token.sub) as string
        ;(session.user as any).level = token.level
        ;(session.user as any).isPremium = token.isPremium
      }
      return session
    },
  },
  session: { strategy: "jwt" },
}
