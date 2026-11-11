import { db } from "./client"
import { getCreditPricing, type CreditSettingKey } from "./credits"
import { TrackType, type PrismaClient } from "./generated/prisma/client"

export type AICreditAction =
  | "CURRICULUM"
  | "MATERIAL"
  | "QUIZ"
  | "EXERCISE_GENERATE"
  | "EXERCISE_SUBMIT"
  | "PROJECT"
  | "CHAT"

export type AICreditDecisionReason =
  | "NO_TRACK_CONTEXT"
  | "FREE_MODULE"
  | "FREE_BUNDLE"
  | "FREE_BUNDLE_PAID_MODULE"
  | "CUSTOM_TRACK"
  | "BUNDLE_PURCHASE"
  | "BUNDLE_REQUIRED"
  | "CUSTOM_TRACK_FORBIDDEN"
  | "TRACK_NOT_FOUND"

export type AICreditDecisionInput = {
  userId: string
  action: AICreditAction
  trackId?: string | null
  moduleIsFree?: boolean
}

export type AICreditDecision = {
  action: AICreditAction
  canAccess: boolean
  shouldDebit: boolean
  creditCost: number
  debitAmount: number
  reason: AICreditDecisionReason
}

type AICreditClient = Pick<PrismaClient, "appSetting" | "track" | "bundlePurchase">

const ACTION_SETTING_KEYS: Record<AICreditAction, CreditSettingKey> = {
  CURRICULUM: "credit_cost_curriculum",
  MATERIAL: "credit_cost_material",
  QUIZ: "credit_cost_quiz",
  EXERCISE_GENERATE: "credit_cost_exercise_generate",
  EXERCISE_SUBMIT: "credit_cost_exercise_submit",
  PROJECT: "credit_cost_project",
  CHAT: "credit_cost_chat",
}

function decision(params: {
  action: AICreditAction
  creditCost: number
  canAccess: boolean
  shouldDebit: boolean
  reason: AICreditDecisionReason
}): AICreditDecision {
  return {
    ...params,
    debitAmount: params.shouldDebit ? params.creditCost : 0,
  }
}

export async function getAICreditDecision(
  params: AICreditDecisionInput,
  client: AICreditClient = db
): Promise<AICreditDecision> {
  const pricing = await getCreditPricing(client)
  const creditCost = pricing[ACTION_SETTING_KEYS[params.action]]

  if (!params.trackId) {
    return decision({
      action: params.action,
      creditCost,
      canAccess: true,
      shouldDebit: true,
      reason: "NO_TRACK_CONTEXT",
    })
  }

  const track = await client.track.findUnique({
    where: { id: params.trackId },
    select: { type: true, userId: true, isFree: true },
  })

  if (!track) {
    return decision({
      action: params.action,
      creditCost,
      canAccess: false,
      shouldDebit: false,
      reason: "TRACK_NOT_FOUND",
    })
  }

  if (track.type === TrackType.CUSTOM) {
    const canAccess = track.userId === params.userId
    return decision({
      action: params.action,
      creditCost,
      canAccess,
      shouldDebit: canAccess,
      reason: canAccess ? "CUSTOM_TRACK" : "CUSTOM_TRACK_FORBIDDEN",
    })
  }

  if (track.isFree) {
    if (params.moduleIsFree) {
      return decision({
        action: params.action,
        creditCost,
        canAccess: true,
        shouldDebit: false,
        reason: "FREE_MODULE",
      })
    }

    return decision({
      action: params.action,
      creditCost,
      canAccess: true,
      shouldDebit: true,
      reason: "FREE_BUNDLE_PAID_MODULE",
    })
  }

  const purchase = await client.bundlePurchase.findUnique({
    where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
    select: { id: true },
  })

  return decision({
    action: params.action,
    creditCost,
    canAccess: !!purchase,
    shouldDebit: false,
    reason: purchase ? "BUNDLE_PURCHASE" : "BUNDLE_REQUIRED",
  })
}
