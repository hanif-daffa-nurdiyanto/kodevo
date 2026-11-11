import path from "node:path"
import { config } from "dotenv"

config({ path: path.resolve(process.cwd(), ".env") })
config({ path: path.resolve(process.cwd(), "../../apps/web/.env") })
config({ path: path.resolve(process.cwd(), "../../apps/web/.env.local"), override: true })

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Check apps/web/.env or apps/web/.env.local.")
  }
  return databaseUrl
}
