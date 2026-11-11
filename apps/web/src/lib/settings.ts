import { db } from "@kodevo/db"

export type SettingKey =
  | "payment_provider"
  | "mayar_plus_monthly_url"
  | "mayar_plus_annual_url"
  | "mayar_pro_monthly_url"
  | "mayar_pro_annual_url"

const ENV_FALLBACKS: Record<SettingKey, string> = {
  payment_provider: process.env.PAYMENT_PROVIDER ?? "stripe",
  mayar_plus_monthly_url: process.env.MAYAR_PLUS_MONTHLY_URL ?? process.env.MAYAR_MONTHLY_URL ?? "",
  mayar_plus_annual_url: process.env.MAYAR_PLUS_ANNUAL_URL ?? process.env.MAYAR_ANNUAL_URL ?? "",
  mayar_pro_monthly_url: process.env.MAYAR_PRO_MONTHLY_URL ?? "",
  mayar_pro_annual_url: process.env.MAYAR_PRO_ANNUAL_URL ?? "",
}

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.appSetting.findUnique({ where: { key } })
  return row?.value ?? ENV_FALLBACKS[key]
}

export async function getSettings(keys: SettingKey[]): Promise<Record<SettingKey, string>> {
  const rows = await db.appSetting.findMany({ where: { key: { in: keys } } })
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Record<SettingKey, string>>
  return Object.fromEntries(
    keys.map((k) => [k, map[k] ?? ENV_FALLBACKS[k]])
  ) as Record<SettingKey, string>
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}
