import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { getSetting, setSetting, type SettingKey } from "@/lib/settings"

const ALLOWED_KEYS: SettingKey[] = [
  "payment_provider",
  "mayar_plus_monthly_url",
  "mayar_plus_annual_url",
  "mayar_pro_monthly_url",
  "mayar_pro_annual_url",
]

export async function GET() {
  await requireAdmin()

  const entries = await Promise.all(
    ALLOWED_KEYS.map(async (key) => [key, await getSetting(key)])
  )
  return NextResponse.json(Object.fromEntries(entries))
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()

  const body = await req.json().catch(() => ({}))

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as SettingKey)) continue
    if (typeof value !== "string") continue
    await setSetting(key as SettingKey, value.trim())
  }

  return NextResponse.json({ ok: true })
}
