import { db } from "./client"
import { CreditTxType, Prisma, type PrismaClient } from "./generated/prisma/client"

export class InsufficientCreditError extends Error {
  constructor(public readonly balance: number, public readonly required: number) {
    super("Insufficient credit balance")
    this.name = "InsufficientCreditError"
  }
}

export const DEFAULT_CREDIT_SETTINGS = {
  credit_price_idr: 50,
  credit_cost_curriculum: 13,
  credit_cost_material: 31,
  credit_cost_quiz: 11,
  credit_cost_exercise_generate: 8,
  credit_cost_exercise_submit: 8,
  credit_cost_project: 12,
  credit_cost_chat: 8,
} as const

export type CreditSettingKey = keyof typeof DEFAULT_CREDIT_SETTINGS
export type CreditPricing = Record<CreditSettingKey, number>

export type CreditTransactionInput = {
  userId: string
  type: keyof typeof CreditTxType
  amount: number
  action?: string
  refId?: string
}

type AppSettingClient = Pick<PrismaClient, "appSetting">

function assertPositiveAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Credit amount must be a positive integer")
  }
}

function normalizeSettingValue(key: CreditSettingKey, value?: string | null): number {
  const parsed = value === undefined || value === null || value.trim() === "" ? NaN : Number(value)
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_CREDIT_SETTINGS[key]
}

export async function getCreditPricing(client: AppSettingClient = db): Promise<CreditPricing> {
  const keys = Object.keys(DEFAULT_CREDIT_SETTINGS) as CreditSettingKey[]
  const rows = await client.appSetting.findMany({ where: { key: { in: keys } } })
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return Object.fromEntries(
    keys.map((key) => [key, normalizeSettingValue(key, values.get(key))])
  ) as CreditPricing
}

export async function seedDefaultCreditSettings(client: AppSettingClient = db): Promise<void> {
  await Promise.all(
    (Object.entries(DEFAULT_CREDIT_SETTINGS) as [CreditSettingKey, number][]).map(([key, value]) =>
      client.appSetting.upsert({
        where: { key },
        update: {},
        create: { key, value: String(value) },
      })
    )
  )
}

export async function applyCreditTransaction(
  params: CreditTransactionInput
): Promise<{ balanceAfter: number }> {
  return db.$transaction((tx) => applyCreditTransactionInTx(tx, params))
}

export async function applyCreditTransactionInTx(
  tx: Prisma.TransactionClient,
  params: CreditTransactionInput
): Promise<{ balanceAfter: number }> {
  assertPositiveAmount(params.amount)

  if (params.type === "DEBIT" && !params.action) {
    throw new Error("Debit credit transaction requires an action")
  }

  await tx.creditBalance.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId, balance: 0 },
  })

  let balanceAfter: number

  if (params.type === "DEBIT") {
    const updated = await tx.creditBalance.updateMany({
      where: { userId: params.userId, balance: { gte: params.amount } },
      data: { balance: { decrement: params.amount } },
    })

    if (updated.count === 0) {
      const balance = await tx.creditBalance.findUnique({ where: { userId: params.userId } })
      throw new InsufficientCreditError(balance?.balance ?? 0, params.amount)
    }

    const balance = await tx.creditBalance.findUniqueOrThrow({ where: { userId: params.userId } })
    balanceAfter = balance.balance
  } else {
    const balance = await tx.creditBalance.update({
      where: { userId: params.userId },
      data: { balance: { increment: params.amount } },
    })
    balanceAfter = balance.balance
  }

  await tx.creditTransaction.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceAfter,
      action: params.action,
      refId: params.refId,
    },
  })

  return { balanceAfter }
}
