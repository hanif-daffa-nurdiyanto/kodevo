import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@kodevo/db"
import { sendWelcomeEmail } from "@kodevo/email"
import { authConfig } from "./config"
import { generateUniqueUsername } from "./username"
import bcrypt from "bcryptjs"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  events: {
    async createUser({ user }) {
      if (!user.id) return
      const displayName = user.name ?? user.email?.split("@")[0] ?? "Pengguna"
      const username = await generateUniqueUsername(displayName)
      await db.user.update({ where: { id: user.id }, data: { username } })
      if (user.email) sendWelcomeEmail(user.email, displayName).catch(() => {})
    },
  },
  providers: [
    ...authConfig.providers.filter((p) => (p as { id?: string }).id !== "credentials"),
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, image: true, password: true, level: true, isPremium: true },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          level: user.level,
          isPremium: user.isPremium,
        }
      },
    }),
  ],
})
