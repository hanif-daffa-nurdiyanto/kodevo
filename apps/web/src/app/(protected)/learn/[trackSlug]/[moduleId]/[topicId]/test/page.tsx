"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { Button } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { Badge } from "@kodevo/ui/badge"
import { Progress } from "@kodevo/ui/progress"
import { CodeViewer } from "@/components/code-viewer"
import type { ReviewComment } from "@/components/code-viewer"
import {
  SandpackIDE,
  LivePreviewPane,
} from "@/components/sandpack-editor"
import { cn } from "@kodevo/utils"
import {
  ChevronLeft, Loader2,
  RotateCcw, ArrowRight, FlaskConical, BookOpen, Zap, Sparkles, RefreshCw, Play, GitBranch, ExternalLink,
  Lightbulb, Paperclip, CheckCircle2, XCircle,
} from "lucide-react"
import { AIUsageCounter } from "@/components/ai-usage-counter"
import { sanitizeExerciseStarterCode } from "@/lib/exercise-utils"

// Languages that use Sandpack (have live preview)
function isSandpackLang(lang: string) {
  return ["html", "css", "javascript", "react", "typescript"].includes(lang)
}
function hasPreview(lang: string) {
  return isSandpackLang(lang)
}
function isNonCodingLang(lang: string) {
  return ["essay", "text", "writing", "copywriting", "marketing", "business", "softskill"].includes(lang)
}

// Piston API — run server-side code execution
const PISTON_LANG: Record<string, { language: string; version: string; filename: string }> = {
  python:     { language: "python",  version: "3.10.0",  filename: "main.py"    },
  sql:        { language: "sqlite3", version: "3.36.0",  filename: "query.sql"  },
  go:         { language: "go",      version: "1.16.2",  filename: "main.go"    },
  java:       { language: "java",    version: "15.0.2",  filename: "Main.java"  },
  kotlin:     { language: "kotlin",  version: "1.8.20",  filename: "main.kt"    },
  rust:       { language: "rust",    version: "1.68.2",  filename: "main.rs"    },
  c:          { language: "c",       version: "10.2.0",  filename: "main.c"     },
  cpp:        { language: "c++",     version: "10.2.0",  filename: "main.cpp"   },
  php:        { language: "php",     version: "8.2.3",   filename: "main.php"   },
  swift:      { language: "swift",   version: "5.3.3",   filename: "main.swift" },
  dart:       { language: "dart",    version: "2.19.6",  filename: "main.dart"  },
}

async function runWithPiston(language: string, code: string): Promise<{ stdout: string; stderr: string }> {
  const cfg = PISTON_LANG[language]
  if (!cfg) return { stdout: "", stderr: `Eksekusi tidak didukung untuk ${language}.` }
  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: cfg.language, version: cfg.version, files: [{ name: cfg.filename, content: code }] }),
  })
  const data = await res.json()
  return { stdout: data.run?.stdout ?? "", stderr: data.run?.stderr ?? "" }
}

const NAV_H = 0
const BAR_H = 56

interface Exercise {
  id: string
  prompt: string
  requirements: string[]
  starterCode: Record<string, string> | null
  level: string
  attemptNumber: number
}

interface Result {
  totalScore: number
  funcScore: number
  qualityScore: number
  efficiencyScore: number
  passed: boolean
  feedback: string
}

const SCORE_ROWS = [
  { key: "funcScore",       label: "Kebenaran",  weight: "60%" },
  { key: "qualityScore",    label: "Kualitas",   weight: "25%" },
  { key: "efficiencyScore", label: "Efisiensi",  weight: "15%" },
] as const

function formatFilesForEval(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([name, code]) => `=== ${name} ===\n${code}`)
    .join("\n\n")
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export default function TestPage() {
  const params    = useParams()
  const router    = useRouter()
  const trackSlug = params.trackSlug as string
  const moduleId  = params.moduleId  as string
  const topicId   = params.topicId   as string

  const [phase, setPhase]     = useState<"loading" | "ready" | "coding" | "submitting" | "result" | "passed">("loading")
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [language, setLanguage] = useState("html")
  const [files, setFiles]       = useState<Record<string, string>>({})
  const [exerciseFileKeys, setExerciseFileKeys] = useState<string[]>([])
  // Tracks current Sandpack code without causing re-renders (for submission)
  const editedFilesRef = useRef<Record<string, string>>({})
  const [result, setResult]     = useState<Result | null>(null)
  const [xpGained, setXpGained] = useState(0)
  const [error, setError]       = useState("")
  const [nextHref, setNextHref]   = useState<string | null>(null)
  const [nextType, setNextType]   = useState<"topic" | "module" | "complete" | null>(null)
  const [isPro, setIsPro]         = useState(false)
  const [rightTab, setRightTab]   = useState<"preview" | "output" | "result">("preview")
  const [submitMode, setSubmitMode] = useState<"inline" | "github">("inline")
  const [runOutput, setRunOutput] = useState<{ stdout: string; stderr: string } | null>(null)
  const [runLoading, setRunLoading] = useState(false)
  const [review, setReview]       = useState<{ summary: string; comments: ReviewComment[] } | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewCode, setReviewCode] = useState("")
  const [answer, setAnswer] = useState("")
  const [showHint, setShowHint] = useState(false)

  // Project submission state
  const [githubConnected, setGithubConnected] = useState(false)
  const [repos, setRepos]       = useState<{ fullName: string; name: string; defaultBranch: string }[]>([])
  const [selectedRepo, setSelectedRepo] = useState("")
  const [projectBranch, setProjectBranch] = useState("main")
  const [reposLoading, setReposLoading] = useState(false)

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(d => { if (d.user?.isPro || d.user?.isPremium) setIsPro(true) }).catch(() => {})
    fetch("/api/github/me").then(r => r.json()).then(d => {
      if (d.user) {
        setGithubConnected(true)
        // Pre-load repos immediately so the dropdown is ready when user opens GitHub tab
        loadRepos()
      }
    }).catch(() => {})
  }, [])

  async function loadRepos() {
    setReposLoading(true)
    try {
      const res = await fetch("/api/github/repos")
      if (res.ok) setRepos(await res.json())
    } finally {
      setReposLoading(false)
    }
  }

  async function fetchExercise(force = false) {
    setPhase("loading")
    setError("")
    setResult(null)
    setReview(null)
    setSubmitMode("inline")
    setRightTab("preview")
    setAnswer("")
    setShowHint(false)
    try {
      const res  = await fetch("/api/test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, force }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat soal")
      const ex: Exercise = data.exercise
      setExercise(ex)
      const lang = data.suggestedLanguage ?? "html"
      setLanguage(lang)
      const initFiles = isNonCodingLang(lang) ? {} : sanitizeExerciseStarterCode(lang, ex.starterCode)
      setFiles(initFiles)
      editedFilesRef.current = initFiles
      setExerciseFileKeys(Object.keys(initFiles).map(f => f.startsWith("/") ? f : `/${f}`))
      setRightTab(isSandpackLang(lang) ? "preview" : "output")
      setRunOutput(null)
      setPhase("ready")
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal memuat soal"))
      setPhase("ready")
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchExercise() }, [topicId])

  async function triggerInlineReview(code: string, lang: string, prompt: string) {
    setReviewLoading(true)
    try {
      const res = await fetch("/api/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang, context: prompt }),
      })
      if (!res.ok) return
      const d = await res.json()
      setReview({ summary: d.summary, comments: d.comments })
    } catch {
      // fail silently
    } finally {
      setReviewLoading(false)
    }
  }

  async function handleRun() {
    const mainFile = Object.values(files)[0] ?? ""
    if (!mainFile.trim()) return
    setRunLoading(true)
    setRightTab("output")
    try {
      const out = await runWithPiston(language, mainFile)
      setRunOutput(out)
    } catch {
      setRunOutput({ stdout: "", stderr: "Gagal menjalankan kode. Cek koneksi internet." })
    } finally {
      setRunLoading(false)
    }
  }

  async function handleSubmit() {
    if (!exercise) return
    setPhase("submitting")
    setError("")
    setReview(null)
    const currentFiles = isSandpackLang(language) ? editedFilesRef.current : files
    if (Object.keys(currentFiles).length === 0) return
    const codeStr = formatFilesForEval(currentFiles)
    try {
      const res  = await fetch(`/api/test/${exercise.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeStr, language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal submit")
      setResult(data.result)
      setXpGained(data.xpGained ?? 0)
      setPhase(data.result.passed ? "passed" : "result")
      setRightTab("result")
      if (isPro) { setReviewCode(codeStr); triggerInlineReview(codeStr, language, exercise.prompt) }
      if (data.result.passed) {
        setNextHref(`/learn/${trackSlug}/${moduleId}`)
        setNextType("topic")
        fetch(`/api/learn/next?topicId=${topicId}&trackSlug=${trackSlug}`)
          .then(r => r.json())
          .then(d => { if (d.href) { setNextHref(d.href); setNextType(d.type) } })
          .catch(() => {})
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal submit"))
      setPhase("coding")
    }
  }

  async function handleNonCodingSubmit() {
    if (!exercise || !answer.trim()) return
    setPhase("submitting")
    setError("")
    setReview(null)
    try {
      const res = await fetch(`/api/test/${exercise.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: answer, language: isNonCodingLang(language) ? language : "essay" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal submit")
      setResult(data.result)
      setXpGained(data.xpGained ?? 0)
      setPhase(data.result.passed ? "passed" : "result")
      if (data.result.passed) {
        setNextHref(`/learn/${trackSlug}/${moduleId}`)
        setNextType("topic")
        fetch(`/api/learn/next?topicId=${topicId}&trackSlug=${trackSlug}`)
          .then(r => r.json())
          .then(d => { if (d.href) { setNextHref(d.href); setNextType(d.type) } })
          .catch(() => {})
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal submit"))
      setPhase("ready")
    }
  }

  async function handleProjectSubmit() {
    if (!exercise || !selectedRepo) return
    setPhase("submitting")
    setError("")
    try {
      const res = await fetch(`/api/test/${exercise.id}/submit-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: selectedRepo, branch: projectBranch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal submit project")
      setResult(data.result)
      setXpGained(data.xpGained ?? 0)
      setPhase(data.result.passed ? "passed" : "result")
      setRightTab("result")
      if (data.result.passed) {
        setNextHref(`/learn/${trackSlug}/${moduleId}`)
        setNextType("topic")
        fetch(`/api/learn/next?topicId=${topicId}&trackSlug=${trackSlug}`)
          .then(r => r.json())
          .then(d => { if (d.href) { setNextHref(d.href); setNextType(d.type) } })
          .catch(() => {})
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal submit project"))
      setPhase("ready")
    }
  }

  const isSubmitting = phase === "submitting"
  const isDone       = phase === "passed" || phase === "result"

  // ── Full-screen loading ──────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 bg-white" style={{ height: `calc(100vh - ${NAV_H}px)` }}>
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI sedang menyiapkan soal untukmu...</p>
      </div>
    )
  }

  // ── IDE layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden bg-white" style={{ height: `calc(100vh - ${NAV_H}px)` }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between gap-5 border-b border-[#F3F4F6] bg-white px-7"
        style={{ height: BAR_H }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/learn/${trackSlug}/${moduleId}/${topicId}`}
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Materi
          </Link>
          <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-bold">Latihan Coding</span>
          {(exercise?.attemptNumber ?? 0) > 1 && (
            <Badge variant="outline" className="text-[10px] shrink-0 h-5">
              Percobaan ke-{exercise?.attemptNumber}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <AIUsageCounter className="bg-[#EFF6FF] text-primary" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => fetchExercise(true)} disabled={isSubmitting} title="Muat soal baru">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {!isSandpackLang(language) && (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={handleRun} disabled={isSubmitting || runLoading}>
              {runLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Jalankan
            </Button>
          )}
          <Button onClick={submitMode === "github" ? handleProjectSubmit : handleSubmit} disabled={isSubmitting} size="sm" className="h-10 gap-1.5">
            {isSubmitting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Menilai...</>
              : submitMode === "github"
              ? <><GitBranch className="h-3.5 w-3.5" />Submit GitHub</>
              : <>Submit & Nilai<ArrowRight className="h-3.5 w-3.5" /></>}
          </Button>
        </div>
      </div>

      {/* ── 3-panel body ─────────────────────────────────────────────────── */}
      {exercise && (isNonCodingLang(language) || Object.keys(files).length === 0) ? (
        <NonCodingExerciseLayout
          exercise={exercise}
          answer={answer}
          setAnswer={(value) => {
            setAnswer(value)
            if (phase === "ready") setPhase("coding")
          }}
          showHint={showHint}
          setShowHint={setShowHint}
          result={result}
          xpGained={xpGained}
          error={error}
          isSubmitting={isSubmitting}
          isDone={isDone}
          onSubmit={handleNonCodingSubmit}
          onRefresh={() => fetchExercise(true)}
          onBack={() => router.push(`/learn/${trackSlug}/${moduleId}/${topicId}`)}
          nextHref={nextHref}
          nextType={nextType}
          onNext={(href) => router.push(href)}
        />
      ) : exercise && Object.keys(files).length > 0 ? (
        <div className="flex overflow-hidden" style={{ flex: 1, minHeight: 0 }}>

          {/* ── Left: Problem ─────────────────────────────────────────────── */}
          <aside
            className="shrink-0 overflow-y-auto border-r border-[#F3F4F6] bg-white"
            style={{ width: "min(44%, 420px)", height: "100%" }}
          >
            <div className="space-y-5 p-9">
              {/* Prompt */}
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <Badge className="bg-[#F0FDF4] text-[#00A88A]">Coding Exercise</Badge>
                  <Badge className="bg-[#EFF6FF] text-[#3D8EF0]">{exercise.level}</Badge>
                </div>
                <h1 className="mb-4 text-[26px] font-extrabold leading-tight">Exercise</h1>
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-foreground">
                  {exercise.prompt}
                </p>
              </div>

              {/* Requirements */}
              {exercise.requirements.length > 0 && (
                <div className="pt-1">
                  <h3 className="mb-3 text-[15px] font-bold">Requirement</h3>
                  <ul className="space-y-2.5">
                    {exercise.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-6">
                        <span className="shrink-0 font-bold text-kodevo-green">{i + 1}.</span>
                        <span className={cn(isDone && result?.passed ? "text-foreground" : "text-muted-foreground")}>
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Work locally via GitHub */}
              <div className="rounded-[10px] border border-[#F3F4F6] bg-[#FAFBFC] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground">Starter files</p>
                <p className="font-mono text-xs text-foreground">{Object.keys(files).join(", ")}</p>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setSubmitMode(submitMode === "github" ? "inline" : "github")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition-colors",
                    submitMode === "github"
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-[#E5E7EB] bg-white text-muted-foreground hover:bg-[#FAFBFC] hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span>Kerjakan di Lokal dengan GitHub</span>
                  </span>
                  <span className="text-[10px] opacity-60">{submitMode === "github" ? "Aktif" : "→"}</span>
                </button>
              </div>

              {/* Post-submit actions */}
              {isDone && (
                <div className="space-y-2 border-t border-[#F3F4F6] pt-4">
                  {phase === "passed" && (
                    nextHref ? (
                      <Button onClick={() => router.push(nextHref)} className="w-full" size="sm">
                        {nextType === "complete" ? "Sertifikat 🎉" : nextType === "module" ? "Modul Berikutnya" : "Topik Berikutnya"}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button className="w-full" size="sm" disabled>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Memuat...
                      </Button>
                    )
                  )}
                  {phase === "result" && (
                    <>
                      <Link href={`/learn/${trackSlug}/${moduleId}/${topicId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />Baca Ulang Materi
                      </Link>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => fetchExercise(true)}>
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Coba Lagi (soal baru)
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* ── Center + Right ───────────────────────────────────────────── */}
          {submitMode === "github" ? (
            /* GitHub mode: center = repo picker, right = hasil only */
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 border-r border-[#F3F4F6] bg-[#FAFBFC] p-8" style={{ minWidth: 0 }}>
                <div className="w-full max-w-sm space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Submit via GitHub
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kerjakan di lokal, push ke GitHub, lalu pilih repo untuk dinilai AI.
                    </p>
                  </div>

                  {!githubConnected ? (
                    <div className="space-y-3 rounded-xl border border-dashed border-[#E5E7EB] p-6 text-center">
                      <GitBranch className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">GitHub belum terhubung.</p>
                      <a
                        href={`/api/github/connect?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <GitBranch className="h-4 w-4" />
                        Hubungkan GitHub
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Repository</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedRepo}
                            onChange={e => {
                              const repo = repos.find(r => r.fullName === e.target.value)
                              setSelectedRepo(e.target.value)
                              setProjectBranch(repo?.defaultBranch ?? "main")
                            }}
                            disabled={reposLoading}
                            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
                          >
                            <option value="">{reposLoading ? "Memuat repo..." : repos.length === 0 ? "Tidak ada repo — klik refresh" : "Pilih repo..."}</option>
                            {repos.map(r => <option key={r.fullName} value={r.fullName}>{r.fullName}</option>)}
                          </select>
                          <Button size="sm" variant="outline" onClick={loadRepos} disabled={reposLoading} className="shrink-0 px-2.5">
                            {reposLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Branch</label>
                        <input
                          value={projectBranch}
                          onChange={e => setProjectBranch(e.target.value)}
                          placeholder="main"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      {selectedRepo && (
                        <a
                          href={`https://github.com/${selectedRepo}/tree/${projectBranch}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Lihat repo di GitHub
                        </a>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/60 p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Cara kerja:</p>
                    <p>1. Kerjakan project di komputer lokal</p>
                    <p>2. Push ke GitHub repo kamu</p>
                    <p>3. Pilih repo + branch → klik Submit GitHub</p>
                    <p>4. AI akan fetch file dan menilai kode kamu</p>
                  </div>
                </div>
              </div>
              <RightPanel
                language={language}
                rightTab="result"
                setRightTab={setRightTab}
                isDone={isDone}
                result={result}
                xpGained={xpGained}
                runOutput={null}
                runLoading={false}
                isPro={isPro}
                reviewLoading={reviewLoading}
                review={review}
                reviewCode={reviewCode}
                router={router}
                nextHref={nextHref}
                nextType={nextType}
                trackSlug={trackSlug}
                moduleId={moduleId}
                topicId={topicId}
                fetchExercise={fetchExercise}
                hasLivePreview={false}
              />
            </>
          ) : isSandpackLang(language) ? (
            <SandpackIDE
              exerciseId={exercise.id}
              language={language}
              files={files}
              userFiles={exerciseFileKeys}
              readOnly={isSubmitting}
              onFilesChange={(f) => { editedFilesRef.current = f }}
              rightSlot={
                <RightPanel
                  language={language}
                  rightTab={rightTab}
                  setRightTab={setRightTab}
                  isDone={isDone}
                  result={result}
                  xpGained={xpGained}
                  runOutput={runOutput}
                  runLoading={runLoading}
                  isPro={isPro}
                  reviewLoading={reviewLoading}
                  review={review}
                  reviewCode={reviewCode}
                  router={router}
                  nextHref={nextHref}
                  nextType={nextType}
                  trackSlug={trackSlug}
                  moduleId={moduleId}
                  topicId={topicId}
                  fetchExercise={fetchExercise}
                />
              }
            />
          ) : (
            <>
              {/* Plain textarea for Python / SQL / etc. */}
              <div style={{ flex: "1 1 0%", minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
                <div
                  className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 bg-[#1A1A2E] px-5"
                  style={{ borderRight: "1px solid #F3F4F6" }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00C9A7]" />
                  <span className="ml-2 font-mono text-xs font-medium text-zinc-400">
                    {PISTON_LANG[language]?.filename ?? Object.keys(files)[0] ?? language}
                  </span>
                </div>
                <textarea
                  value={Object.values(files)[0] ?? ""}
                  onChange={(e) => {
                    const key = Object.keys(files)[0] ?? (PISTON_LANG[language]?.filename ?? language)
                    setFiles({ [key]: e.target.value })
                    if (phase === "ready") setPhase("coding")
                  }}
                  disabled={isSubmitting}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="flex-1 resize-none bg-[#16162a] p-5 font-mono text-sm leading-7 text-zinc-200 focus:outline-none disabled:opacity-60"
                  style={{ borderRight: "1px solid #F3F4F6", tabSize: 2 }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault()
                      const el = e.currentTarget
                      const s = el.selectionStart, en = el.selectionEnd
                      const v = el.value
                      const next = v.slice(0, s) + "  " + v.slice(en)
                      const key = Object.keys(files)[0] ?? "main.py"
                      setFiles({ [key]: next })
                      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2 })
                    }
                  }}
                />
              </div>
              <RightPanel
                language={language}
                rightTab={rightTab}
                setRightTab={setRightTab}
                isDone={isDone}
                result={result}
                xpGained={xpGained}
                runOutput={runOutput}
                runLoading={runLoading}
                isPro={isPro}
                reviewLoading={reviewLoading}
                review={review}
                reviewCode={reviewCode}
                router={router}
                nextHref={nextHref}
                nextType={nextType}
                trackSlug={trackSlug}
                moduleId={moduleId}
                topicId={topicId}
                fetchExercise={fetchExercise}
              />
            </>
          )}
        </div>
      ) : (
        phase === "ready" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">Soal tidak tersedia.</p>
            <Button onClick={() => fetchExercise()} variant="outline" size="sm">Coba Muat Ulang</Button>
          </div>
        )
      )}
    </div>
  )
}

function NonCodingExerciseLayout({
  exercise,
  answer,
  setAnswer,
  showHint,
  setShowHint,
  result,
  xpGained,
  error,
  isSubmitting,
  isDone,
  onSubmit,
  onRefresh,
  onBack,
  nextHref,
  nextType,
  onNext,
}: {
  exercise: Exercise
  answer: string
  setAnswer: (value: string) => void
  showHint: boolean
  setShowHint: (show: boolean) => void
  result: Result | null
  xpGained: number
  error: string
  isSubmitting: boolean
  isDone: boolean
  onSubmit: () => void
  onRefresh: () => void
  onBack: () => void
  nextHref: string | null
  nextType: "topic" | "module" | "complete" | null
  onNext: (href: string) => void
}) {
  const reviewRows = result
    ? [
      {
        pass: result.funcScore >= 70,
        label: result.funcScore >= 70 ? "Requirement utama terpenuhi" : "Requirement utama belum lengkap",
      },
      {
        pass: result.qualityScore >= 70,
        label: result.qualityScore >= 70 ? "Kualitas jawaban cukup kuat" : "Kualitas jawaban masih perlu dirapikan",
      },
      {
        pass: result.efficiencyScore >= 70,
        label: result.efficiencyScore >= 70 ? "Jawaban efisien dan mudah dipakai" : "Jawaban masih bisa dibuat lebih fokus",
      },
    ]
    : []

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white text-[#1A1A2E]">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-[#F3F4F6] px-5 sm:px-7">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#6B7280] transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Materi
        </button>
        <div className="min-w-0 flex-1" />
        {error && <span className="hidden text-xs text-destructive sm:block">{error}</span>}
        <AIUsageCounter className="bg-[#EFF6FF] text-primary" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={onRefresh}
          disabled={isSubmitting}
          title="Muat soal baru"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="h-auto shrink-0 overflow-y-auto border-b border-[#F3F4F6] px-6 py-8 lg:h-full lg:w-[46%] lg:border-b-0 lg:border-r lg:px-9">
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <Badge className="bg-[#F0FDF4] text-[#00A88A]">Practical Exercise</Badge>
            <Badge className="bg-[#FEF9C3] text-[#D97706]">{exercise.level}</Badge>
            {(exercise.attemptNumber ?? 0) > 1 && (
              <Badge variant="outline" className="text-[10px]">Percobaan ke-{exercise.attemptNumber}</Badge>
            )}
          </div>

          <h1 className="mb-4 font-heading text-[26px] font-extrabold leading-tight">Exercise</h1>
          <p className="mb-5 whitespace-pre-wrap text-[15px] leading-8">
            {exercise.prompt}
          </p>

          {exercise.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-[15px] font-bold">Requirement</h3>
              <div className="flex flex-col gap-2.5">
                {exercise.requirements.map((req, index) => (
                  <div key={`${index}-${req}`} className="flex gap-2.5 text-sm leading-6">
                    <span className="shrink-0 font-bold text-[#00A88A]">{index + 1}.</span>
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5 rounded-[10px] border border-[#F3F4F6] bg-[#FAFBFC] px-[18px] py-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.04em] text-[#6B7280]">Submission Info</div>
            <p className="m-0 text-[13px] leading-7">
              Tulis jawaban final yang siap dinilai AI. Lampiran masih opsional secara visual; penilaian utama memakai teks di kolom jawaban.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 p-0 text-[13px] font-bold text-[#3D8EF0] transition-colors hover:text-[#00A88A]"
          >
            <Lightbulb className="h-4 w-4" />
            {showHint ? "Sembunyikan hint" : "Lihat hint"}
          </button>
          {showHint && (
            <p className="mt-2.5 rounded-lg bg-[#FEF9C3] px-3.5 py-3 text-[13px] leading-7 text-[#6B7280]">
              Mulai dari requirement satu per satu, lalu tutup jawaban dengan aksi atau kesimpulan yang konkret.
            </p>
          )}
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:px-9">
            <label className="mb-2.5 block text-[13px] font-bold">Jawabanmu</label>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Tulis jawabanmu di sini..."
              disabled={isSubmitting || result?.passed}
              className="min-h-[220px] w-full resize-y rounded-[10px] border border-[#E5E7EB] p-4 text-sm leading-7 text-[#1A1A2E] transition-shadow placeholder:text-[#9CA3AF] focus:border-[#3D8EF0] focus:outline-none focus:ring-4 focus:ring-[#3D8EF0]/10 disabled:bg-[#FAFBFC]"
            />

            <label className="mb-2.5 mt-6 block text-[13px] font-bold">Lampiran (opsional)</label>
            <div className="rounded-[10px] border-[1.5px] border-dashed border-[#E5E7EB] px-7 py-7 text-center text-[13px] text-[#9CA3AF] transition-colors hover:border-[#3D8EF0] hover:text-[#3D8EF0]">
              <Paperclip className="mx-auto mb-2 h-5 w-5" />
              Seret file ke sini, atau klik untuk upload
            </div>

            {isDone && (
              <div className="mt-7">
                <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.04em] text-[#6B7280]">AI Review</div>
                <div className="flex flex-col gap-2">
                  {reviewRows.map((row) => (
                    <div
                      key={row.label}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-[13px]",
                        row.pass ? "bg-[#F0FDF4] text-[#00A88A]" : "bg-[#FEF2F2] text-[#EF4444]"
                      )}
                    >
                      {row.pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {row.label}
                    </div>
                  ))}
                </div>
                {result?.feedback && (
                  <p className="mt-3.5 whitespace-pre-wrap text-[13px] leading-7 text-[#6B7280]">{result.feedback}</p>
                )}
                {result?.passed && xpGained > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    <Zap className="h-3.5 w-3.5" />+{xpGained} XP
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5 border-t border-[#F3F4F6] px-6 py-4 lg:px-9">
            {result?.passed ? (
              nextHref ? (
                <Button className="h-11 gap-1.5 rounded-lg px-6" onClick={() => onNext(nextHref)}>
                  {nextType === "complete" ? "Lihat Sertifikat" : nextType === "module" ? "Modul Berikutnya" : "Topik Berikutnya"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="h-11 rounded-lg px-6" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />Memuat...
                </Button>
              )
            ) : (
              <Button
                onClick={onSubmit}
                disabled={isSubmitting || !answer.trim()}
                className="kodevo-gradient h-11 rounded-lg px-6 text-sm font-bold text-white disabled:bg-[#D1D5DB] disabled:bg-none"
              >
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menilai...</> : <>Kirim untuk Direview AI <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
            )}
            {result && !result.passed && (
              <Button variant="outline" className="h-11 rounded-lg px-5" onClick={onRefresh}>
                <RotateCcw className="mr-2 h-4 w-4" />Coba Soal Baru
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Right panel extracted so it can be reused for both Sandpack and plain ──
function RightPanel({
  language, rightTab, setRightTab, isDone, result, xpGained, runOutput, runLoading,
  isPro, reviewLoading, review, reviewCode, router, nextHref, nextType,
  trackSlug, moduleId, topicId, fetchExercise, hasLivePreview = true,
}: {
  language: string
  rightTab: "preview" | "output" | "result"
  setRightTab: (t: "preview" | "output" | "result") => void
  isDone: boolean
  result: Result | null
  xpGained: number
  runOutput: { stdout: string; stderr: string } | null
  runLoading: boolean
  isPro: boolean
  reviewLoading: boolean
  review: { summary: string; comments: ReviewComment[] } | null
  reviewCode: string
  router: ReturnType<typeof import("next/navigation").useRouter>
  nextHref: string | null
  nextType: "topic" | "module" | "complete" | null
  trackSlug: string
  moduleId: string
  topicId: string
  fetchExercise: (force?: boolean) => void
  hasLivePreview?: boolean
}) {
  const showPreviewTab = hasPreview(language) && hasLivePreview
  const showOutputTab  = !isSandpackLang(language)

  return (
    <div style={{ width: 420, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-[#F3F4F6] bg-white px-3">
        {showPreviewTab && (
          <button onClick={() => setRightTab("preview")} className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", rightTab === "preview" ? "bg-[#F0FDF4] text-[#00A88A]" : "text-muted-foreground hover:text-foreground")}>
            Preview
          </button>
        )}
        {showOutputTab && (
          <button onClick={() => setRightTab("output")} className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors", rightTab === "output" ? "bg-[#F0FDF4] text-[#00A88A]" : "text-muted-foreground hover:text-foreground")}>
            Output
            {runLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </button>
        )}
        <button
          onClick={() => isDone && setRightTab("result")}
          className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors", rightTab === "result" ? "bg-[#EFF6FF] text-primary" : "text-muted-foreground hover:text-foreground", !isDone && "pointer-events-none opacity-40")}
        >
          Hasil
          {isDone && result && (
            <span className={cn("inline-flex h-4 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-[10px] font-bold", result.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
              {result.totalScore}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* Preview (Sandpack) — use visibility:hidden (not display:none) so the iframe stays
            active and receives compile updates even when another tab is shown */}
        {showPreviewTab && (
          <div style={{
            position: "absolute", inset: 0,
            visibility: rightTab === "preview" ? "visible" : "hidden",
            pointerEvents: rightTab === "preview" ? "auto" : "none",
          }}>
            <LivePreviewPane language={language} />
          </div>
        )}

        {/* Output (Python / SQL) */}
        {showOutputTab && rightTab === "output" && (
          <div className="absolute inset-0 overflow-y-auto bg-zinc-950 p-4 font-mono text-sm">
            {!runOutput && !runLoading && (
              <p className="text-zinc-500">Klik &quot;Jalankan&quot; untuk melihat output kode kamu.</p>
            )}
            {runLoading && <p className="text-zinc-400 animate-pulse">Menjalankan kode...</p>}
            {runOutput && (
              <>
                {runOutput.stdout && (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">{runOutput.stdout}</pre>
                )}
                {runOutput.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap leading-relaxed mt-2">{runOutput.stderr}</pre>
                )}
                {!runOutput.stdout && !runOutput.stderr && (
                  <p className="text-zinc-500">Program selesai tanpa output.</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Result */}
        {rightTab === "result" && isDone && result && (
                  <div className="absolute inset-0 space-y-4 overflow-y-auto bg-white p-5">
                    {/* Score */}
                    <div className={cn(
                      "rounded-xl border p-5",
                      result.passed ? "border-emerald-200 bg-[#F0FDF4]" : "border-red-200 bg-red-50"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl",
                          result.passed ? "bg-white" : "bg-red-100"
                        )}>
                          {result.passed ? "🎉" : "😅"}
                        </div>
                        <div>
                          <p className={cn("text-2xl font-extrabold", result.passed ? "text-emerald-800" : "text-red-700")}>
                            {result.totalScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
                          </p>
                          <p className={cn("text-xs", result.passed ? "text-emerald-600" : "text-red-500")}>
                            {result.passed ? "Lulus! Kode kamu sudah benar." : "Belum lulus, min. 70. Coba lagi!"}
                          </p>
                          {result.passed && xpGained > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                              <Zap className="h-3 w-3" />+{xpGained} XP
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    {result.passed ? (
                      nextHref ? (
                        <Button onClick={() => router.push(nextHref)} className="w-full gap-1.5" size="sm">
                          {nextType === "complete" ? "Lihat Sertifikat 🎉" : nextType === "module" ? "Modul Berikutnya" : "Topik Berikutnya"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button className="w-full" size="sm" disabled>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Memuat...
                        </Button>
                      )
                    ) : (
                      <div className="flex gap-2">
                        <Link href={`/learn/${trackSlug}/${moduleId}/${topicId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 gap-1")}>
                          <BookOpen className="h-3.5 w-3.5" />Materi
                        </Link>
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => fetchExercise(true)}>
                          <RotateCcw className="h-3.5 w-3.5" />Coba Lagi
                        </Button>
                      </div>
                    )}

                    {/* Breakdown */}
                    <Card className="border-[#F3F4F6]">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Breakdown</p>
                        {SCORE_ROWS.map((s) => (
                          <div key={s.key} className="flex items-center gap-3">
                            <div className="w-24 shrink-0">
                              <p className="text-xs text-muted-foreground">{s.label}</p>
                              <p className="text-[10px] text-muted-foreground/60">{s.weight}</p>
                            </div>
                            <Progress value={result[s.key]} className="h-1.5 flex-1" />
                            <p className="text-xs font-bold w-7 text-right tabular-nums">{result[s.key]}</p>
                          </div>
                        ))}
                        {result.feedback && (
                          <div className="border-t border-[#F3F4F6] pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Feedback AI</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{result.feedback}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Pro review */}
                    {isPro && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                          <p className="text-sm font-semibold text-violet-700">Analisis Mendalam</p>
                          {reviewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />}
                        </div>
                        {reviewLoading && (
                          <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-center">
                            <p className="text-sm text-violet-600">AI sedang menganalisis baris per baris...</p>
                          </div>
                        )}
                        {review && !reviewLoading && (
                          <>
                            <Card className="border-violet-200 bg-violet-50">
                              <CardContent className="p-3">
                                <p className="text-sm text-violet-800 leading-relaxed">{review.summary}</p>
                              </CardContent>
                            </Card>
                            <CodeViewer code={reviewCode} comments={review.comments} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
      </div>
    </div>
  )
}
