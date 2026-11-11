import { db } from "@kodevo/db"

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 28)
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/.test(username) || /^[a-z0-9]{3,30}$/.test(username)
}

export async function generateUniqueUsername(name: string): Promise<string> {
  const base = slugifyName(name) || "user"
  let candidate = base
  let attempt = 0

  while (true) {
    const existing = await db.user.findUnique({ where: { username: candidate }, select: { id: true } })
    if (!existing) return candidate
    attempt++
    candidate = `${base.slice(0, 26)}_${attempt}`
  }
}
