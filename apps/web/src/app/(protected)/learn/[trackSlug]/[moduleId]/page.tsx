import { auth } from "@kodevo/auth"
import { canAccessTrackContent, db, TrackType } from "@kodevo/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { Badge } from "@kodevo/ui/badge"
import { Progress } from "@kodevo/ui/progress"
import { ChevronLeft, CheckCircle2, BookOpen, ArrowRight, Lock, Trophy, ClipboardList } from "lucide-react"
import { cn } from "@kodevo/utils"

export default async function ModulePage({ params }: { params: Promise<{ trackSlug: string; moduleId: string }> }) {
  const { trackSlug, moduleId } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) redirect("/login")

  const mod = await db.module.findFirst({
    where: { id: moduleId, track: { slug: trackSlug } },
    include: { topics: { orderBy: { order: "asc" } }, track: true },
  })
  if (!mod) notFound()
  if (mod.track?.type === TrackType.BUNDLE && !mod.track.publishedAt) notFound()

  const isLocked = !(await canAccessTrackContent({
    userId: dbUser.id,
    trackId: mod.trackId,
    moduleIsFree: mod.isFree,
  }))
  if (isLocked) redirect(`/learn/${trackSlug}`)

  // Auto-enroll
  await db.enrollment.upsert({
    where: { userId_moduleId: { userId: dbUser.id, moduleId } },
    update: {},
    create: { userId: dbUser.id, moduleId, status: "IN_PROGRESS" },
  })

  // Which topics have passed quizzes
  const passedQuizzes = await db.topicQuiz.findMany({
    where: { userId: dbUser.id, topicId: { in: mod.topics.map((t) => t.id) }, passed: true },
    select: { topicId: true },
  })
  const passedTopics = new Set(passedQuizzes.map((q) => q.topicId))

  // Which topics have material generated (global cache — any user's generation counts)
  const materials = await db.generatedMaterial.findMany({
    where: { topicId: { in: mod.topics.map((t) => t.id) } },
    select: { topicId: true },
    distinct: ["topicId"],
  })
  const hasMaterial = new Set(materials.map((m) => m.topicId))

  // Module assessment gate
  const allTopicsDone = mod.topics.length > 0 && mod.topics.every((t) => passedTopics.has(t.id))
  const assessment = await db.moduleAssessment.findUnique({
    where: { moduleId },
    include: {
      attempts: {
        where: { userId: dbUser.id, passed: true },
        take: 1,
      },
    },
  })
  const assessmentPassed = (assessment?.attempts.length ?? 0) > 0
  const progressValue = mod.topics.length > 0 ? Math.round((passedTopics.size / mod.topics.length) * 100) : 0

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 md:px-6">
      <Link href={`/learn/${trackSlug}`} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" />
        {mod.track?.title ?? "Track"}
      </Link>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="builder">Modul {mod.order}</Badge>
          {mod.isFree && <Badge variant="secondary">Gratis</Badge>}
          {assessmentPassed && (
            <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
              <Trophy className="mr-1 h-3 w-3" />
              Lulus
            </Badge>
          )}
        </div>
        <h1 className="text-[28px] font-extrabold leading-tight">{mod.title}</h1>
        <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-muted-foreground">{mod.description}</p>
      </div>

      <div className="mb-8 rounded-xl border border-muted bg-[#FAFBFC] px-6 py-5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
            <BookOpen className="h-4 w-4 text-primary" />
            {passedTopics.size}/{mod.topics.length} topik selesai
          </span>
          <span className="text-[13px] font-bold text-[#00A88A]">{progressValue}%</span>
        </div>
        <Progress value={progressValue} />
      </div>

      <h2 className="mb-4 text-base font-bold">Topik di modul ini</h2>
      <div className="space-y-3">
        {mod.topics.map((topic, i) => {
          const passed = passedTopics.has(topic.id)
          const hasRead = hasMaterial.has(topic.id)
          const isNext = !passed && mod.topics.slice(0, i).every((t) => passedTopics.has(t.id))

          return (
            <Card
              key={topic.id}
              className={cn(
                "transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]",
                isNext && "border-2 border-kodevo-green bg-[#F0FDF4]",
                !isNext && !passed && "opacity-60"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold",
                        passed
                          ? "kodevo-gradient text-white"
                          : isNext
                          ? "bg-white text-primary shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {passed ? <CheckCircle2 className="h-4 w-4" /> : isNext ? topic.order : <Lock className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-[15px] font-bold", !isNext && !passed && "text-muted-foreground")}>
                          {topic.title}
                        </p>
                        {passed && <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Selesai</Badge>}
                        {isNext && !passed && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Sedang belajar</Badge>}
                        {!passed && hasRead && <Badge variant="outline" className="text-xs">Materi dibaca</Badge>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{topic.description}</p>
                    </div>
                  </div>

                  {(passed || isNext) && (
                    <Link
                      href={`/learn/${trackSlug}/${moduleId}/${topic.id}`}
                      className={buttonVariants({ variant: passed ? "outline" : "default", size: "sm" }) + " shrink-0"}
                    >
                      {passed ? "Review" : hasRead ? "Lanjutkan" : "Mulai"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Assessment Gate Banner */}
      {allTopicsDone && (
        <div className="mt-6">
          {assessmentPassed ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-5 flex items-center gap-4">
                <Trophy className="h-8 w-8 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-700">Module Gate Lulus!</p>
                  <p className="text-sm text-muted-foreground">Kamu sudah menyelesaikan quiz dan coding challenge. Lanjutkan ke modul berikutnya.</p>
                </div>
                <Link
                  href={`/learn/${trackSlug}`}
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "shrink-0")}
                >
                  Lanjut <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-primary shadow-sm">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Semua Topik Selesai — Ambil Assessment!</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Selesaikan quiz + coding challenge untuk membuka modul berikutnya.
                  </p>
                </div>
                <Link
                  href={`/learn/${trackSlug}/${moduleId}/assessment`}
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "shrink-0")}
                >
                  Mulai Assessment <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
