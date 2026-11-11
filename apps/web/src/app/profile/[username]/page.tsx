import { db, issueCertificateIfTrackComplete, TrackType } from "@kodevo/db"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@kodevo/ui/avatar"
import { Badge } from "@kodevo/ui/badge"
import { GitFork, GraduationCap, MapPin } from "lucide-react"
import { cn } from "@kodevo/utils"
import Link from "next/link"
import { PublicProfileTabs } from "./profile-tabs"
import { ShareProfileButton } from "./share-profile-button"

const levelConfig: Record<string, { label: string; emoji: string; color: string }> = {
  UNSCREENED: { label: "Learner", emoji: "📋", color: "bg-muted text-muted-foreground" },
  BEGINNER: { label: "Explorer", emoji: "🧭", color: "bg-[#F0FDF4] text-[#00A88A]" },
  MID: { label: "Builder", emoji: "🔨", color: "bg-[#EFF6FF] text-[#3D8EF0]" },
  ADVANCE: { label: "Creator", emoji: "🚀", color: "bg-[#FEF9C3] text-[#D97706]" },
}

const pendidikanLabel: Record<string, string> = {
  SMP: "SMP",
  SMA: "SMA / SMK",
  D3: "D3",
  S1: "S1",
  S2: "S2",
  S3: "S3",
  BOOTCAMP: "Bootcamp",
  SELF_TAUGHT: "Self-taught",
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      name: true,
      image: true,
      level: true,
      xp: true,
      isPremium: true,
      isProfilePublic: true,
      domisili: true,
      pendidikan: true,
      githubUsername: true,
      createdAt: true,
      streaks: { select: { date: true } },
      topicQuizzes: { where: { passed: true }, select: { topicId: true } },
      curricula: {
        orderBy: { id: "desc" },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: { topics: { select: { id: true, title: true } } },
          },
        },
      },
    },
  })

  if (!user || !user.isProfilePublic) notFound()

  const bundleTracks = await db.track.findMany({
    where: {
      type: TrackType.BUNDLE,
      publishedAt: { not: null },
      modules: {
        some: {
          assessment: {
            attempts: {
              some: { userId: user.id, passed: true },
            },
          },
        },
      },
    },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          topics: { select: { id: true, title: true } },
          assessment: {
            select: {
              attempts: {
                where: { userId: user.id, passed: true },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  const lv = levelConfig[user.level] ?? levelConfig.UNSCREENED
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "KV"

  const passedSet = new Set(user.topicQuizzes.map((q) => q.topicId))
  const completedCurricula = user.curricula.filter((c) => {
    const total = c.modules.reduce((s, m) => s + m.topics.length, 0)
    const passed = c.modules.reduce((s, m) => s + m.topics.filter((t) => passedSet.has(t.id)).length, 0)
    return total > 0 && passed === total
  })

  const completedBundles = bundleTracks.filter((track) => {
    const topicIds = track.modules.flatMap((module) => module.topics.map((topic) => topic.id))
    const allTopicsPassed = topicIds.length > 0 && topicIds.every((topicId) => passedSet.has(topicId))
    const allAssessmentsPassed =
      track.modules.length > 0 && track.modules.every((module) => (module.assessment?.attempts.length ?? 0) > 0)
    return allTopicsPassed && allAssessmentsPassed
  })

  await Promise.all(
    completedBundles
      .filter((track) => track.hasCertificate)
      .map((track) => issueCertificateIfTrackComplete({ userId: user.id, trackId: track.id }).catch(() => null))
  )

  const completedTracks = [...completedCurricula, ...completedBundles]

  const inProgressCurricula = user.curricula.filter((c) => {
    const total = c.modules.reduce((s, m) => s + m.topics.length, 0)
    const passed = c.modules.reduce((s, m) => s + m.topics.filter((t) => passedSet.has(t.id)).length, 0)
    return passed > 0 && passed < total
  })
  const inProgressBundles = bundleTracks.filter((track) => {
    if (completedBundles.some((completed) => completed.id === track.id)) return false

    const topicIds = track.modules.flatMap((module) => module.topics.map((topic) => topic.id))
    const passedTopicCount = topicIds.filter((topicId) => passedSet.has(topicId)).length
    const passedAssessmentCount = track.modules.filter((module) => (module.assessment?.attempts.length ?? 0) > 0).length
    return passedTopicCount > 0 || passedAssessmentCount > 0
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sortedDates = [...user.streaks].sort((a, b) => b.date.getTime() - a.date.getTime())
  let streak = 0
  for (let i = 0; i < sortedDates.length; i++) {
    const d = new Date(sortedDates[i].date)
    d.setHours(0, 0, 0, 0)
    if (Math.round((today.getTime() - d.getTime()) / 86400000) === i) streak++
    else break
  }

  const projectCount = completedTracks.reduce((sum, c) => sum + c.modules.length, 0)
  const profileNote = [
    user.domisili ? `Berdomisili di ${user.domisili}` : null,
    user.pendidikan ? `latar belajar ${pendidikanLabel[user.pendidikan] ?? user.pendidikan}` : null,
    user.githubUsername ? `aktif ngoding di GitHub` : null,
  ].filter(Boolean).join(", ")
  const certificates = completedTracks.map((c) => ({
    id: c.id,
    title: c.title,
    href: `/learn/${c.slug}/complete`,
    meta: `Selesai · ${c.modules.length} modul · ${c.modules.reduce((sum, m) => sum + m.topics.length, 0)} topik`,
    modules: c.modules.slice(0, 6).map((m) => m.title),
  }))
  const tracks = [...inProgressCurricula, ...inProgressBundles].map((c) => {
    const total = c.modules.reduce((s, m) => s + m.topics.length, 0)
    const passed = c.modules.reduce((s, m) => s + m.topics.filter((t) => passedSet.has(t.id)).length, 0)
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0

    return {
      id: c.id,
      title: c.title,
      icon: c.icon ?? "📚",
      pct,
      meta: `${pct}% selesai`,
    }
  })

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">
      <nav className="border-b border-[#F3F4F6]">
        <div className="flex min-h-[73px] items-center justify-between px-6 py-4 sm:px-12">
          <Link href="/" className="flex items-center gap-2 text-inherit">
            <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto" priority />
          </Link>
          <Link href="/register" className="kodevo-gradient inline-flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white">
            Mulai Belajar
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-[760px] px-6 pb-0 pt-8">
        <section className="mb-5 flex flex-wrap items-center gap-6">
          <Avatar className="h-24 w-24 shrink-0 text-3xl shadow-[0_8px_20px_rgba(0,201,167,0.25)]">
            <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
            <AvatarFallback className="kodevo-gradient text-[34px] font-extrabold text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-extrabold">{user.name ?? username}</h1>
              {user.isPremium && <Badge className="bg-amber-500 text-white">Premium</Badge>}
              <Badge className={cn("text-xs font-bold", lv.color)}>{lv.emoji} {lv.label}</Badge>
            </div>
            <div className="mb-2 text-sm text-muted-foreground">
              @{username} · Bergabung {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </div>
            <p className="m-0 max-w-[480px] text-sm leading-[1.6] text-[#1A1A2E]">
              {profileNote || "Lagi belajar membangun skill digital lewat roadmap dan project nyata di Kodevo."}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {user.domisili && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{user.domisili}</span>}
              {user.pendidikan && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{pendidikanLabel[user.pendidikan] ?? user.pendidikan}</span>}
              {user.githubUsername && (
                <a href={`https://github.com/${user.githubUsername}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <GitFork className="h-3 w-3" />{user.githubUsername}
                </a>
              )}
            </div>
          </div>
          <ShareProfileButton />
        </section>

        <section className="mb-7 grid grid-cols-2 border-y border-[#F3F4F6] sm:grid-cols-4">
          {[
            { value: completedTracks.length, label: "Track selesai", className: "text-[#00A88A]" },
            { value: user.xp.toLocaleString("id-ID"), label: "Total XP", className: "kodevo-gradient-text" },
            { value: `🔥 ${streak}`, label: "Hari streak", className: "text-[#D97706]" },
            { value: projectCount, label: "Project", className: "text-foreground" },
          ].map((stat, index) => (
            <div key={stat.label} className={cn("p-3.5 text-center", index < 3 && "sm:border-r sm:border-[#F3F4F6]", index % 2 === 0 && "border-r border-[#F3F4F6] sm:border-r")}>
              <div className={cn("font-heading text-xl font-extrabold", stat.className)}>{stat.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </section>

        <PublicProfileTabs certificates={certificates} tracks={tracks} />
      </main>

      <footer className="mt-6 border-t border-[#F3F4F6] px-6 py-6 text-center text-[13px] text-muted-foreground">
        © 2026 Kodevo · Belajar lebih cepat.
      </footer>
    </div>
  )
}
