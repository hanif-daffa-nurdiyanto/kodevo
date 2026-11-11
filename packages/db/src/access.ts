import { db } from "./client"
import { TrackType, type PrismaClient } from "./generated/prisma/client"

type TrackAccessClient = Pick<PrismaClient, "track" | "bundlePurchase">

export type TrackContentAccessInput = {
  userId: string
  trackId: string
  moduleIsFree: boolean
}

export type TrackModuleAccessInput = {
  userId: string
  trackId: string
  modules: Array<{ id: string; isFree: boolean }>
}

export async function canAccessTrackContent(
  params: TrackContentAccessInput,
  client: TrackAccessClient = db
): Promise<boolean> {
  if (params.moduleIsFree) return true

  const track = await client.track.findUnique({
    where: { id: params.trackId },
    select: { id: true, type: true, userId: true, isFree: true },
  })
  if (!track) return false

  if (track.type === TrackType.CUSTOM) {
    return track.userId === params.userId
  }

  if (track.isFree) return true

  const purchase = await client.bundlePurchase.findUnique({
    where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
    select: { id: true },
  })

  return !!purchase
}

export async function getTrackModuleAccessMap(
  params: TrackModuleAccessInput,
  client: TrackAccessClient = db
): Promise<Map<string, boolean>> {
  const access = new Map(params.modules.map((module) => [module.id, module.isFree]))
  const hasLockedModule = params.modules.some((module) => !module.isFree)
  if (!hasLockedModule) return access

  const track = await client.track.findUnique({
    where: { id: params.trackId },
    select: { type: true, userId: true, isFree: true },
  })
  if (!track) return access

  const canAccessPaidContent =
    track.type === TrackType.CUSTOM
      ? track.userId === params.userId
      : track.isFree
      ? true
      : !!(await client.bundlePurchase.findUnique({
          where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
          select: { id: true },
        }))

  if (!canAccessPaidContent) return access

  for (const module of params.modules) {
    access.set(module.id, true)
  }

  return access
}
