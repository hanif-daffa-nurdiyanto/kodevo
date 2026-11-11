import { createPgAdapter } from "./adapter"
import { PrismaClient } from "./generated/prisma/client"

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  const adapter = createPgAdapter(connectionString)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

// Lazy singleton — client dibuat saat pertama kali diakses, bukan saat module load
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!global.__prisma) {
      global.__prisma = createPrismaClient()
    }
    const client = global.__prisma as unknown as Record<PropertyKey, unknown>
    const value = client[prop]
    return typeof value === "function" ? value.bind(global.__prisma) : value
  },
})
