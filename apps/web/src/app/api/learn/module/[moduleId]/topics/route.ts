import { NextRequest, NextResponse } from "next/server"
import { auth } from "@kodevo/auth"
import { canAccessTrackContent, db, TrackType } from "@kodevo/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { moduleId } = await params
  const trackSlug = req.nextUrl.searchParams.get("trackSlug")
  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null

  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const mod = await db.module.findFirst({
    where: { id: moduleId, ...(trackSlug ? { track: { slug: trackSlug } } : {}) },
    include: {
      track: { select: { title: true, slug: true, type: true, publishedAt: true } },
      topics: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, order: true },
      },
    },
  })

  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 })
  if (mod.track?.type === TrackType.BUNDLE && !mod.track.publishedAt) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 })
  }
  const canAccess = await canAccessTrackContent({
    userId: dbUser.id,
    trackId: mod.trackId,
    moduleIsFree: mod.isFree,
  })
  if (!canAccess) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 })
  }

  await db.enrollment.upsert({
    where: { userId_moduleId: { userId: dbUser.id, moduleId } },
    update: {},
    create: { userId: dbUser.id, moduleId, status: "IN_PROGRESS" },
  })

  const topicIds = mod.topics.map((topic) => topic.id)
  const [passedQuizzes, materials] = await Promise.all([
    db.topicQuiz.findMany({
      where: { userId: dbUser.id, topicId: { in: topicIds }, passed: true },
      select: { topicId: true },
    }),
    db.generatedMaterial.findMany({
      where: { topicId: { in: topicIds } },
      select: { topicId: true },
      distinct: ["topicId"],
    }),
  ])

  const passedSet = new Set(passedQuizzes.map((quiz) => quiz.topicId))
  const materialSet = new Set(materials.map((material) => material.topicId))
  const firstOpenTopicId = mod.topics.find((topic) => !passedSet.has(topic.id))?.id ?? mod.topics.at(-1)?.id ?? null
  const passedCount = mod.topics.filter((topic) => passedSet.has(topic.id)).length

  return NextResponse.json({
    module: {
      id: mod.id,
      title: mod.title,
      order: mod.order,
      trackTitle: mod.track?.title ?? "Track",
      trackSlug: mod.track?.slug ?? trackSlug,
      passedCount,
      totalTopics: mod.topics.length,
      progress: mod.topics.length > 0 ? Math.round((passedCount / mod.topics.length) * 100) : 0,
    },
    topics: mod.topics.map((topic) => ({
      ...topic,
      passed: passedSet.has(topic.id),
      hasMaterial: materialSet.has(topic.id),
      unlocked: passedSet.has(topic.id) || topic.id === firstOpenTopicId,
    })),
  })
}
