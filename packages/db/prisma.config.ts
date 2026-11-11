import path from "node:path"
import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

config({ path: path.resolve(process.cwd(), ".env") })
config({ path: path.resolve(process.cwd(), "../../apps/web/.env") })
config({ path: path.resolve(process.cwd(), "../../apps/web/.env.local"), override: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
