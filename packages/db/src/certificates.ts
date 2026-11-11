import { db } from "./client"
import { TrackType, type Certificate, type Prisma, type PrismaClient } from "./generated/prisma/client"

type CertificateClient = Pick<
  PrismaClient,
  "track" | "topicQuiz" | "moduleAssessmentAttempt" | "certificate" | "bundlePurchase" | "$transaction"
>

export type IssueCertificateResult =
  | { issued: true; certificate: Certificate; alreadyIssued: boolean }
  | { issued: false; reason: "TRACK_NOT_FOUND" | "NOT_BUNDLE" | "CERTIFICATE_DISABLED" | "BUNDLE_NOT_PURCHASED" | "TRACK_NOT_COMPLETE" }

export type IssueCertificateInput = {
  userId: string
  trackId: string
}

function buildCertificateNo(userId: string, trackId: string, slug: string): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "TRCK"
  return `KDV-${prefix}-${trackId.slice(-4).toUpperCase()}-${userId.slice(-6).toUpperCase()}`
}

async function isTrackComplete(
  client: Pick<PrismaClient, "topicQuiz" | "moduleAssessmentAttempt">,
  params: { userId: string; moduleIds: string[]; topicIds: string[] }
): Promise<boolean> {
  const { userId, moduleIds, topicIds } = params
  if (moduleIds.length === 0 || topicIds.length === 0) return false

  const [passedTopics, passedAssessments] = await Promise.all([
    client.topicQuiz.findMany({
      where: { userId, topicId: { in: topicIds }, passed: true },
      select: { topicId: true },
    }),
    client.moduleAssessmentAttempt.findMany({
      where: {
        userId,
        passed: true,
        assessment: { moduleId: { in: moduleIds } },
      },
      select: { assessment: { select: { moduleId: true } } },
    }),
  ])

  const passedTopicIds = new Set(passedTopics.map((topic) => topic.topicId))
  const passedModuleIds = new Set(passedAssessments.map((attempt) => attempt.assessment.moduleId))

  return topicIds.every((topicId) => passedTopicIds.has(topicId)) &&
    moduleIds.every((moduleId) => passedModuleIds.has(moduleId))
}

export async function issueCertificateIfTrackComplete(
  params: IssueCertificateInput,
  client: CertificateClient = db
): Promise<IssueCertificateResult> {
  const track = await client.track.findUnique({
    where: { id: params.trackId },
    select: {
      id: true,
      slug: true,
      type: true,
      isFree: true,
      hasCertificate: true,
      modules: {
        select: {
          id: true,
          topics: { select: { id: true } },
        },
      },
    },
  })

  if (!track) return { issued: false, reason: "TRACK_NOT_FOUND" }
  if (track.type !== TrackType.BUNDLE) return { issued: false, reason: "NOT_BUNDLE" }
  if (!track.hasCertificate) return { issued: false, reason: "CERTIFICATE_DISABLED" }

  const purchase = await client.bundlePurchase.findUnique({
    where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
    select: { id: true },
  })
  if (!track.isFree && !purchase) return { issued: false, reason: "BUNDLE_NOT_PURCHASED" }

  const moduleIds = track.modules.map((module) => module.id)
  const topicIds = track.modules.flatMap((module) => module.topics.map((topic) => topic.id))
  const complete = await isTrackComplete(client, { userId: params.userId, moduleIds, topicIds })
  if (!complete) return { issued: false, reason: "TRACK_NOT_COMPLETE" }

  const existing = await client.certificate.findUnique({
    where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
  })
  if (existing) return { issued: true, certificate: existing, alreadyIssued: true }

  const certificateNo = buildCertificateNo(params.userId, params.trackId, track.slug)
  const certificate = await client.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.certificate.upsert({
      where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
      update: {},
      create: {
        userId: params.userId,
        trackId: params.trackId,
        certificateNo,
      },
    })

    if (purchase) {
      await tx.bundlePurchase.update({
        where: { userId_trackId: { userId: params.userId, trackId: params.trackId } },
        data: { certificateIssuedAt: created.issuedAt },
      })
    }

    return created
  })

  return { issued: true, certificate, alreadyIssued: false }
}
