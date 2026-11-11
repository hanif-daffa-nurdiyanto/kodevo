"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, Check, ChevronLeft, Flame, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { AIUsageCounter } from "@/components/ai-usage-counter"
import { MaterialFeedbackButton } from "@/components/material-feedback-button"
import { QuizSection } from "@/components/quiz-section"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Button, buttonVariants } from "@kodevo/ui/button"
import { Skeleton } from "@kodevo/ui/skeleton"
import { cn } from "@kodevo/utils"

type MaterialResponse = {
  content: string
  quizPassed?: boolean
  canAccessExercise?: boolean
}

type ModuleTopicsResponse = {
  module: {
    id: string
    title: string
    order: number
    trackTitle: string
    trackSlug: string | null
    passedCount: number
    totalTopics: number
    progress: number
  }
  topics: Array<{
    id: string
    title: string
    description: string
    order: number
    passed: boolean
    hasMaterial: boolean
    unlocked: boolean
  }>
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan"
}

function getTitleFromMarkdown(content: string | null) {
  if (!content) return "Materi belajar"
  const heading = content.match(/^#\s+(.+)$/m)
  return heading?.[1]?.trim() || "Materi belajar"
}

function getSidebarCacheKey(trackSlug: string, moduleId: string) {
  return `kodevo:module-topics:${trackSlug}:${moduleId}`
}

function readCachedSidebar(trackSlug: string, moduleId: string): ModuleTopicsResponse | null {
  if (typeof window === "undefined") return null
  try {
    const cached = window.sessionStorage.getItem(getSidebarCacheKey(trackSlug, moduleId))
    return cached ? (JSON.parse(cached) as ModuleTopicsResponse) : null
  } catch {
    return null
  }
}

function writeCachedSidebar(trackSlug: string, moduleId: string, data: ModuleTopicsResponse) {
  try {
    window.sessionStorage.setItem(getSidebarCacheKey(trackSlug, moduleId), JSON.stringify(data))
  } catch {
    // Cache is only a UX optimization.
  }
}

export default function TopicPage() {
  const params = useParams()
  const trackSlug = params.trackSlug as string
  const moduleId = params.moduleId as string
  const topicId = params.topicId as string

  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null)
  const [weeklyRemaining, setWeeklyRemaining] = useState<number | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [canAccessExercise, setCanAccessExercise] = useState(false)
  const [navData, setNavData] = useState<ModuleTopicsResponse | null>(() => readCachedSidebar(trackSlug, moduleId))

  const title = useMemo(() => getTitleFromMarkdown(content), [content])
  const progress = navData?.module.progress ?? 0
  const progressLabel = navData ? `${navData.module.passedCount}/${navData.module.totalTopics}` : ""

  const loadSidebar = useCallback(async () => {
    try {
      const res = await fetch(`/api/learn/module/${moduleId}/topics?trackSlug=${encodeURIComponent(trackSlug)}`)
      if (!res.ok) return
      const data = (await res.json()) as ModuleTopicsResponse
      setNavData(data)
      writeCachedSidebar(trackSlug, moduleId, data)
    } catch {
      // Sidebar is supporting navigation; material loading handles primary errors.
    }
  }, [moduleId, trackSlug])

  const loadMaterial = useCallback(async (force = false) => {
    setLoading(true)
    setStreaming(false)
    setError("")
    if (force) setContent(null)

    try {
      const res = await fetch("/api/ai/generate-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, force }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Gagal memuat materi")
      }

      const contentType = res.headers.get("Content-Type") ?? ""

      if (contentType.includes("application/json")) {
        const data = (await res.json()) as MaterialResponse
        setContent(data.content)
        setQuizPassed(Boolean(data.quizPassed))
        setCanAccessExercise(Boolean(data.canAccessExercise))
        setLoading(false)
        return
      }

      const xDaily = res.headers.get("X-Daily-Remaining")
      const xWeekly = res.headers.get("X-Weekly-Remaining")
      const xExercise = res.headers.get("X-Can-Access-Exercise")
      if (xDaily != null) setDailyRemaining(Number.parseInt(xDaily, 10))
      if (xWeekly != null) setWeeklyRemaining(Number.parseInt(xWeekly, 10))
      setCanAccessExercise(xExercise === "true")

      setLoading(false)
      setStreaming(true)

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Stream materi tidak tersedia")

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk
        setContent(fullContent)
      }
      setStreaming(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
      setStreaming(false)
    }
  }, [topicId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMaterial()
      void loadSidebar()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadMaterial, loadSidebar])

  useEffect(() => {
    const cached = readCachedSidebar(trackSlug, moduleId)
    if (cached) setNavData(cached)
  }, [moduleId, trackSlug])

  const showSkeleton = loading && !content

  return (
    <div className="fixed inset-0 z-[60] flex h-screen flex-col overflow-hidden bg-white text-[#1A1A2E]">
      <header className="sticky top-0 z-20 border-b border-[#F3F4F6] bg-white/90 backdrop-blur">
        <div className="flex min-h-[61px] items-center gap-4 px-4 py-3 sm:px-7">
          <Link
            href={`/learn/${trackSlug}/${moduleId}`}
            className={buttonVariants({ variant: "ghost", size: "sm" }) + " shrink-0 text-[#6B7280]"}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Modul
          </Link>
          {/* <div className="mx-auto hidden h-2 max-w-[400px] flex-1 overflow-hidden rounded-full bg-[#F3F4F6] sm:block">
            <div className="kodevo-gradient h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div> */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-1.5 text-[13px] font-bold text-[#D97706] sm:flex">
              <Flame className="h-4 w-4 fill-current" />
              12
            </div>
            <div className="hidden rounded-full bg-[#F0FDF4] px-3 py-1 text-[13px] font-bold text-[#00A88A] sm:block">
              240 XP
            </div>
            <AIUsageCounter dailyRemaining={dailyRemaining} weeklyRemaining={weeklyRemaining} />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[296px] shrink-0 overflow-hidden border-r border-[#F3F4F6] bg-[#FAFBFC] px-5 py-6 lg:block">
          <div className="mb-6 rounded-xl bg-[linear-gradient(135deg,rgba(0,201,167,0.08),rgba(61,142,240,0.08))] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#3D8EF0]">
              {navData ? `Modul ${navData.module.order}` : "Modul"}
            </div>
            <div className="mt-1 line-clamp-2 font-heading text-base font-bold">{navData?.module.title ?? "Memuat modul..."}</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                <div className="kodevo-gradient h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] font-bold text-[#6B7280]">{progressLabel || "..."}</span>
            </div>
          </div>

          <div className="relative pl-1">
            <div className="absolute bottom-[26px] left-[26px] top-[26px] w-0.5 bg-[#E5E7EB]" />
            <div className="relative flex flex-col gap-1">
              {navData ? navData.topics.map((topic, index) => {
                const active = topic.id === topicId
                const done = topic.passed
                const href = `/learn/${trackSlug}/${moduleId}/${topic.id}`
                const content = (
                  <>
                    <div
                      className={cn(
                        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-[#FAFBFC] text-[13px] font-bold",
                        done || active ? "kodevo-gradient text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"
                      )}
                    >
                      {done ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "line-clamp-2 text-sm",
                        active ? "font-bold text-[#1A1A2E]" : done ? "font-medium text-[#1A1A2E]" : "font-medium text-[#6B7280]"
                      )}
                    >
                      {topic.title}
                    </span>
                  </>
                )

                return (
                  topic.unlocked ? (
                    <Link
                      key={topic.id}
                      href={href}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-[10px] p-2 transition-all duration-200 hover:translate-x-[3px]",
                        active && "bg-white shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                      )}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={topic.id}
                      className={cn(
                        "flex cursor-not-allowed items-center gap-3 rounded-[10px] p-2 transition-all duration-200",
                        active && "bg-white shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                      )}
                    >
                      {content}
                    </div>
                  )
                )
              }) : (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-[10px] p-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="h-full flex-1 overflow-y-auto px-5 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto w-full max-w-[720px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showSkeleton && <MaterialSkeleton />}

          {content && (
            <>
              <div className="mb-8">
                <div className="mb-3 text-[13px] font-semibold text-[#3D8EF0]">Materi aktif</div>
                <h1 className="text-[34px] font-extrabold leading-tight tracking-normal sm:text-4xl">{title}</h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#6B7280]">
                  Baca materinya pelan-pelan, cek contoh kode, lalu buktikan pemahamanmu lewat mini quiz.
                </p>
              </div>

              <article className="prose max-w-none
                prose-headings:font-heading prose-headings:text-foreground
                prose-h1:hidden
                [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold
                [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-bold
                [&_p]:mb-5 [&_p]:text-base [&_p]:leading-8 [&_p]:text-foreground
                [&_ul]:mb-5 [&_ul]:space-y-2 [&_ul]:pl-5
                [&_ol]:mb-5 [&_ol]:space-y-2 [&_ol]:pl-5
                [&_li]:leading-8
                [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm
                [&_pre]:my-7 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-kodevo-dark [&_pre]:bg-kodevo-dark [&_pre]:p-5
                [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm [&_pre_code]:leading-7 [&_pre_code]:text-gray-100
                [&_blockquote]:border-l-4 [&_blockquote]:border-kodevo-green [&_blockquote]:bg-[#F0FDF4] [&_blockquote]:py-3 [&_blockquote]:pl-5 [&_blockquote]:not-italic [&_blockquote]:text-foreground
                [&_strong]:font-bold
                [&_hr]:my-8 [&_hr]:border-border
                [&_table]:mb-6 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:text-sm
                [&_thead]:bg-muted
                [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>

              {streaming && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Menulis materi...
                </div>
              )}

              {!streaming && (
                <>
                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                    <Button variant="outline" size="sm" onClick={() => void loadMaterial(true)} disabled={loading || streaming}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Muat Ulang
                    </Button>
                    <MaterialFeedbackButton topicId={topicId} />
                    <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Materi dibuat sesuai levelmu
                    </div>
                  </div>

                  <QuizSection
                    topicId={topicId}
                    moduleId={moduleId}
                    trackSlug={trackSlug}
                    initialPassed={quizPassed}
                    canAccessExercise={canAccessExercise}
                    onPassed={() => {
                      setQuizPassed(true)
                      void loadSidebar()
                    }}
                  />
                </>
              )}
            </>
          )}

          {!loading && !streaming && !content && !error && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">Materi belum tersedia.</p>
              <Button onClick={() => void loadMaterial()} variant="outline" size="sm" className="mt-4">
                Coba Lagi
              </Button>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}

function MaterialSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-4 h-7 w-28 rounded-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-4 h-4 w-5/6" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
