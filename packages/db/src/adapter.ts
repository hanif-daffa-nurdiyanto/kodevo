import { PrismaPg } from "@prisma/adapter-pg"

function shouldUseSsl(connectionString: string): boolean {
  const configured = process.env.DATABASE_SSL?.toLowerCase()
  if (configured && ["0", "false", "disable", "disabled", "off"].includes(configured)) return false
  if (configured && ["1", "true", "require", "required", "on"].includes(configured)) return true

  try {
    const url = new URL(connectionString)
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase()
    if (sslMode && ["disable", "allow", "prefer"].includes(sslMode)) return false
    if (sslMode && ["require", "verify-ca", "verify-full", "no-verify"].includes(sslMode)) return true

    const host = url.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
      return false
    }
    if (host.includes("supabase.com")) return true
  } catch {
    return false
  }

  return false
}

export function createPgAdapter(connectionString: string): PrismaPg {
  const ssl = shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined
  return new PrismaPg({ connectionString, ssl })
}
