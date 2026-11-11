import { auth } from "@kodevo/auth"
import { db, issueCertificateIfTrackComplete, TrackType } from "@kodevo/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { ArrowRight, BookOpen, Sparkles } from "lucide-react"
import { cn } from "@kodevo/utils"
import { PrintButton } from "./print-button"
import { UpgradeButton } from "@/components/upgrade-button"

export default async function TrackCompletePage({
  params,
}: {
  params: Promise<{ trackSlug: string }>
}) {
  const { trackSlug } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, name: true, xp: true, isPremium: true, isPro: true },
      })
    : sessionUser.email
    ? await db.user.findUnique({
        where: { email: sessionUser.email },
        select: { id: true, name: true, xp: true, isPremium: true, isPro: true },
      })
    : null
  if (!dbUser) redirect("/login")

  const track = await db.track.findUnique({
    where: { slug: trackSlug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { topics: { select: { id: true } } },
      },
    },
  })
  if (!track) notFound()
  if (track.type === TrackType.BUNDLE && !track.publishedAt) notFound()

  const allTopicIds = track.modules.flatMap((m) => m.topics.map((t) => t.id))
  const moduleIds = track.modules.map((m) => m.id)

  const [passedQuizzes, passedAssessments, existingCertificate] = await Promise.all([
    db.topicQuiz.findMany({
      where: { userId: dbUser.id, topicId: { in: allTopicIds }, passed: true },
      select: { topicId: true, createdAt: true },
    }),
    db.moduleAssessmentAttempt.findMany({
      where: {
        userId: dbUser.id,
        passed: true,
        assessment: { moduleId: { in: moduleIds } },
      },
      select: { assessment: { select: { moduleId: true } }, createdAt: true },
    }),
    db.certificate.findUnique({
      where: { userId_trackId: { userId: dbUser.id, trackId: track.id } },
      select: { id: true, certificateNo: true, issuedAt: true },
    }),
  ])

  const passedTopicSet = new Set(passedQuizzes.map((q) => q.topicId))
  const passedAssessmentModuleIds = new Set(passedAssessments.map((a) => a.assessment.moduleId))

  const allTopicsDone = allTopicIds.every((id) => passedTopicSet.has(id))
  const allAssessmentsDone = moduleIds.every((id) => passedAssessmentModuleIds.has(id))
  const isComplete = allTopicsDone && allAssessmentsDone

  if (!isComplete) redirect(`/learn/${trackSlug}`)

  let issuedCertificate = existingCertificate
  if (!issuedCertificate) {
    const issueResult = await issueCertificateIfTrackComplete({ userId: dbUser.id, trackId: track.id })
    if (issueResult.issued) {
      issuedCertificate = {
        id: issueResult.certificate.id,
        certificateNo: issueResult.certificate.certificateNo,
        issuedAt: issueResult.certificate.issuedAt,
      }
    }
  }

  const completedAt = passedAssessments
    .map((a) => a.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?? passedQuizzes.map((q) => q.createdAt).sort((a, b) => b.getTime() - a.getTime())[0]

  const completedDate = completedAt
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(completedAt)
      )
    : "-"

  const totalTopics = allTopicIds.length
  const totalModules = track.modules.length
  const certificateId = issuedCertificate?.certificateNo ?? `KDV-${track.slug.slice(0, 2).toUpperCase()}-${dbUser.id.slice(0, 4).toUpperCase()}`

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-6 py-14 text-center md:px-10">
      <div className="pointer-events-none absolute left-[8%] top-[60px] h-[18px] w-[18px] rotate-12 rounded bg-kodevo-green/60" />
      <div className="pointer-events-none absolute right-[12%] top-[140px] h-3.5 w-3.5 rounded-full bg-primary/50" />
      <div className="pointer-events-none absolute right-[24%] top-10 h-3 w-3 rounded bg-[#D97706]/50" />
      <div className="pointer-events-none absolute left-[18%] top-[200px] h-2.5 w-2.5 rounded-full bg-kodevo-green/40" />

      <div className="relative mx-auto mb-10 max-w-[520px]">
        <div className="kodevo-gradient mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl">
          🎉
        </div>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.05em] text-primary">Track Selesai</div>
        <h1 className="text-[32px] font-extrabold leading-tight">
          Kamu berhasil menyelesaikan {track.title}!
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          {track.goal || "Kerja bagus. Kamu sudah menuntaskan semua materi, quiz, dan assessment di track ini."}
        </p>
      </div>

      <div className="relative mx-auto mb-10 flex max-w-[720px] flex-wrap justify-center gap-8">
        {[
          { value: totalModules, label: "Modul selesai" },
          { value: passedAssessmentModuleIds.size, label: "Project dinilai" },
          { value: dbUser.xp.toLocaleString("id-ID"), label: "Total XP" },
          { value: totalTopics, label: "Topik selesai" },
        ].map((stat) => (
          <div key={stat.label} className="min-w-[110px]">
            <div className="kodevo-gradient-text text-[28px] font-extrabold">{stat.value}</div>
            <div className="text-[13px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="relative mx-auto mb-7 w-full max-w-[640px] rounded-2xl border border-[#F3F4F6] bg-white p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.1)] md:p-12">
        <div className="pointer-events-none absolute inset-3 rounded-[10px] border border-[#F3F4F6]" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="kodevo-gradient h-6 w-6 rounded-md" />
            <span className="font-heading text-base font-extrabold">kodevo</span>
          </div>
          <div className="mb-5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Sertifikat Penyelesaian</div>
          <div className="mb-2 text-[26px] font-extrabold leading-tight">{dbUser.name ?? "Kamu"}</div>
          <p className="mb-6 text-sm text-muted-foreground">telah berhasil menyelesaikan track</p>
          <div className="mb-6 text-xl font-bold text-[#00A88A]">{track.icon ?? "📚"} {track.title}</div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Diselesaikan pada {completedDate}</span>
            <span>·</span>
            <span>ID: {certificateId}</span>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mb-6 flex max-w-[720px] flex-wrap justify-center gap-3 print:hidden">
        <PrintButton />
        {dbUser.isPremium || dbUser.isPro ? (
          <Link href="/learn/new" className={cn(buttonVariants(), "h-12 px-6")}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Pilih Track Baru
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        ) : (
          <div>
            <UpgradeButton className="h-12 px-6" />
            <p className="mt-1.5 text-xs text-muted-foreground">Upgrade Plus untuk belajar track berikutnya</p>
          </div>
        )}
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-12 px-6")}>
          Dashboard
        </Link>
      </div>

      <div className="relative mx-auto max-w-[520px] rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] p-4 text-left">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4 text-primary" />
          Modul diselesaikan
        </div>
        <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
          {track.modules.map((mod) => (
            <div key={mod.id} className="truncate">✓ {mod.title}</div>
          ))}
        </div>
      </div>

      <p className="relative mx-auto mt-5 max-w-[520px] text-center text-xs leading-relaxed text-muted-foreground/60">
        Bukti ini mencatat perjalanan belajar personal di Kodevo dan bukan merupakan sertifikasi profesional formal.
      </p>
    </div>
  )
}
