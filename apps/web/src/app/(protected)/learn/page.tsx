import { redirect } from "next/navigation"
import { auth } from "@kodevo/auth"
import { db, TrackType } from "@kodevo/db"
import { LearnFilteredContent } from "./learn-filtered-content"

const BUNDLES_PER_PAGE = 6
const FILTERS = ["all", "bundle"] as const
const TABS = ["active", "finished"] as const

type LearnFilter = (typeof FILTERS)[number]
type LearnTab = (typeof TABS)[number]

function parsePage(value?: string): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function parseFilter(value?: string): LearnFilter {
  return FILTERS.includes(value as LearnFilter) ? (value as LearnFilter) : "all"
}

function parseTab(value?: string): LearnTab {
  return TABS.includes(value as LearnTab) ? (value as LearnTab) : "active"
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ bundlePage?: string; filter?: string; tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) redirect("/login")

  const params = await searchParams
  const requestedBundlePage = parsePage(params.bundlePage)
  const filter = parseFilter(params.filter)
  const tab = parseTab(params.tab)
  const filterMode = params.filter === "bundle"
    ? "bundle"
    : params.filter === "all"
    ? "all"
    : params.tab === "active"
    ? "active"
    : "all"

  const curricula = await db.track.findMany({
    where: {
      OR: [
        { userId: dbUser.id },
        {
          AND: [
            { type: TrackType.BUNDLE },
            { publishedAt: { not: null } },
            { modules: { some: { enrollments: { some: { userId: dbUser.id } } } } },
            { OR: [{ isFree: true }, { purchases: { some: { userId: dbUser.id } } }] },
          ],
        },
      ],
    },
    orderBy: { id: "desc" },
    include: {
      modules: { orderBy: { order: "asc" }, include: { topics: { select: { id: true } } } },
    },
  })

  const activeBundleIds = curricula.filter((track) => track.type === TrackType.BUNDLE).map((track) => track.id)
  const bundleWhere = {
    type: TrackType.BUNDLE,
    publishedAt: { not: null },
    ...(activeBundleIds.length > 0 ? { id: { notIn: activeBundleIds } } : {}),
  }

  const bundleCount = await db.track.count({ where: bundleWhere })

  const bundleTotalPages = Math.max(1, Math.ceil(bundleCount / BUNDLES_PER_PAGE))
  const bundlePage = Math.min(requestedBundlePage, bundleTotalPages)
  const bundleTracks = await db.track.findMany({
    where: bundleWhere,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    skip: (bundlePage - 1) * BUNDLES_PER_PAGE,
    take: BUNDLES_PER_PAGE,
    select: {
      id: true,
      slug: true,
      icon: true,
      title: true,
      description: true,
      isFree: true,
      priceIdr: true,
      modules: { select: { id: true } },
      purchases: {
        where: { userId: dbUser.id },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (curricula.length === 0 && bundleCount === 0) redirect("/learn/new")

  type CurriculumWithProgress = (typeof curricula)[number] & {
    passedCount: number
    totalTopics: number
    pct: number
    completed: boolean
    moduleLabel: string
  }

  const allTopicIds = curricula.flatMap((curriculum) => curriculum.modules.flatMap((mod) => mod.topics.map((topic) => topic.id)))
  const passedQuizzes = await db.topicQuiz.findMany({
    where: { userId: dbUser.id, passed: true, topicId: { in: allTopicIds } },
    select: { topicId: true },
  })
  const passedSet = new Set(passedQuizzes.map((quiz) => quiz.topicId))

  const list: CurriculumWithProgress[] = curricula.map((curriculum) => {
    const totalTopics = curriculum.modules.reduce((sum, mod) => sum + mod.topics.length, 0)
    const passedCount = curriculum.modules.reduce(
      (sum, mod) => sum + mod.topics.filter((topic) => passedSet.has(topic.id)).length,
      0
    )
    const activeModuleCount = curriculum.modules.filter((mod) => mod.topics.some((topic) => passedSet.has(topic.id))).length || 1
    return {
      ...curriculum,
      passedCount,
      totalTopics,
      pct: totalTopics > 0 ? Math.round((passedCount / totalTopics) * 100) : 0,
      completed: totalTopics > 0 && passedCount === totalTopics,
      moduleLabel: `Modul ${activeModuleCount} dari ${curriculum.modules.length || 1}`,
    }
  })

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-10 md:px-6">
      <div className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight">Track & Bundle Belajar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lanjutkan track yang sedang berjalan, atau mulai yang baru.</p>
      </div>

      <LearnFilteredContent
        curricula={list}
        bundles={bundleTracks.map((track, index) => ({
          id: track.id,
          slug: track.slug,
          icon: track.icon ?? "📚",
          cover: (index + (bundlePage - 1) * BUNDLES_PER_PAGE) % 2 === 0 ? "bg-[#F0FDF4]" : "bg-[#EFF6FF]",
          title: track.title,
          description: track.description,
          modules: track.modules.length,
          isFree: track.isFree,
          priceIdr: track.priceIdr,
          purchased: track.purchases.length > 0,
        }))}
        bundlePagination={{
          page: bundlePage,
          totalPages: bundleTotalPages,
          totalItems: bundleCount,
        }}
        canCreateMore
        initialFilter={filter}
        initialFilterMode={filterMode}
        initialTab={tab}
      />
    </div>
  )
}
