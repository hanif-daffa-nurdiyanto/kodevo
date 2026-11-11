import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { DEFAULT_CREDIT_SETTINGS, db, type CreditSettingKey } from "@kodevo/db"
import { z } from "zod"

const actionCostKeys = [
  "credit_cost_curriculum",
  "credit_cost_material",
  "credit_cost_quiz",
  "credit_cost_exercise_generate",
  "credit_cost_exercise_submit",
  "credit_cost_project",
  "credit_cost_chat",
] as const satisfies CreditSettingKey[]

const schema = z.object(
  Object.fromEntries(actionCostKeys.map((key) => [key, z.number().int().min(0).optional()]))
)

export async function PATCH(req: NextRequest) {
  await requireAdmin()

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await Promise.all(
    actionCostKeys.map((key) => {
      const value = parsed.data[key]
      if (value === undefined) return null
      return db.appSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value ?? DEFAULT_CREDIT_SETTINGS[key]) },
      })
    })
  )

  return NextResponse.json({ ok: true })
}
