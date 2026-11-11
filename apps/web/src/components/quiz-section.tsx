"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@kodevo/ui/button"
import { CheckCircle2, XCircle, Loader2, ChevronRight, RefreshCw, Code2, Lock } from "lucide-react"
import { cn } from "@kodevo/utils"

type ClientQuestion = { question: string; options: string[] }

type QuizResult = {
  passed: boolean
  score: number
  total: number
  results: Array<{ correct: boolean; correctIndex: number; explanation: string }>
}

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "answering"; quizId: string; questions: ClientQuestion[]; answers: (number | null)[]; current: number }
  | { type: "submitting" }
  | { type: "result"; questions: ClientQuestion[]; result: QuizResult }
  | { type: "passed" }

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan"
}

export function QuizSection({
  topicId,
  moduleId,
  trackSlug,
  initialPassed,
  canAccessExercise = false,
  onPassed,
}: {
  topicId: string
  moduleId: string
  trackSlug: string
  initialPassed: boolean
  canAccessExercise?: boolean
  onPassed?: () => void
}) {
  const router = useRouter()
  const [state, setState] = useState<State>(
    initialPassed ? { type: "passed" } : { type: "idle" }
  )
  const [error, setError] = useState("")
  const [nextLoading, setNextLoading] = useState(false)

  async function goToNext() {
    setNextLoading(true)
    try {
      const res = await fetch(`/api/learn/next?topicId=${topicId}&trackSlug=${trackSlug}`)
      if (res.ok) {
        const { href } = await res.json()
        router.push(href)
      }
    } finally {
      setNextLoading(false)
    }
  }

  async function startQuiz() {
    setState({ type: "loading" })
    setError("")
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat kuis")
      if (data.alreadyPassed) { setState({ type: "passed" }); return }
      setState({
        type: "answering",
        quizId: data.quizId,
        questions: data.questions,
        answers: new Array(data.questions.length).fill(null),
        current: 0,
      })
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setState({ type: "idle" })
    }
  }

  function selectAnswer(optionIndex: number) {
    if (state.type !== "answering") return
    const newAnswers = [...state.answers]
    newAnswers[state.current] = optionIndex
    setState({ ...state, answers: newAnswers })
  }

  function goNext() {
    if (state.type !== "answering") return
    setState({ ...state, current: state.current + 1 })
  }

  async function submitQuiz() {
    if (state.type !== "answering") return
    const { quizId, questions, answers } = state
    setState({ type: "submitting" })
    setError("")
    try {
      const res = await fetch(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal submit kuis")
      setState({ type: "result", questions, result: data })
      if (data.passed) onPassed?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setState({ type: "idle" })
    }
  }

  // ── Passed ───────────────────────────────────────────────
  if (state.type === "passed") {
    return (
      <div className="mt-10 border-t border-border pt-8 space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-800 text-sm">Topik selesai!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Kamu sudah lulus mini quiz topik ini.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canAccessExercise ? (
                <Link
                  href={`/learn/${trackSlug}/${moduleId}/${topicId}/test`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                  )}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Latihan Coding
                </Link>
              ) : (
                <Link
                  href="/credits"
                  className="inline-flex items-center gap-1.5 rounded-md border border-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Top-up untuk Latihan
                </Link>
              )}
              <Button size="sm" onClick={goToNext} disabled={nextLoading}>
                {nextLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Topik Berikutnya
                {!nextLoading && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Idle ─────────────────────────────────────────────────
  if (state.type === "idle") {
    return (
      <div className="mt-10 border-t border-border pt-8 space-y-3">
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl">
              🧪
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Uji Pemahamanmu</h3>
              <p className="text-sm text-muted-foreground mb-4">
                5 soal pilihan ganda dari materi yang baru kamu baca. Jawab minimal 3 dengan benar untuk lanjut.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={startQuiz}>
                  Mulai Mini Quiz
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                {canAccessExercise && (
                  <Link
                    href={`/learn/${trackSlug}/${moduleId}/${topicId}/test`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Atau langsung ke latihan coding
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading / Submitting ─────────────────────────────────
  if (state.type === "loading" || state.type === "submitting") {
    return (
      <div className="mt-10 border-t border-border pt-8">
        <div className="rounded-xl border bg-card p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">
            {state.type === "loading" ? "AI sedang menyiapkan soal..." : "Memeriksa jawaban..."}
          </p>
        </div>
      </div>
    )
  }

  // ── Answering — 1 soal per step ──────────────────────────
  if (state.type === "answering") {
    const { questions, answers, current } = state
    const q = questions[current]
    const selected = answers[current]
    const isLast = current === questions.length - 1
    const answered = selected !== null

    return (
      <div className="mt-10 border-t border-border pt-8">
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm">🧪</span>
              <span className="text-sm font-medium">Mini Quiz</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {current + 1} / {questions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-0.5 px-5 pt-4">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < current ? "bg-primary" : i === current ? "bg-primary/40" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Question + options */}
          <div className="px-5 pt-5 pb-6">
            <p className="text-sm font-medium leading-relaxed mb-5">{q.question}</p>

            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected === oi
                return (
                  <button
                    key={oi}
                    onClick={() => selectAnswer(oi)}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-lg border px-3.5 py-3 text-sm text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground font-medium"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex items-center gap-3">
              {!isLast ? (
                <Button size="sm" onClick={goNext} disabled={!answered}>
                  Selanjutnya
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={submitQuiz} disabled={!answered}>
                  Lihat Hasil
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
              {!answered && (
                <p className="text-xs text-muted-foreground">Pilih salah satu jawaban dulu</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────
  if (state.type === "result") {
    const { questions, result } = state
    const pct = Math.round((result.score / result.total) * 100)

    return (
      <div className="mt-10 border-t border-border pt-8">
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Score header */}
          <div
            className={cn(
              "px-5 py-4 flex items-center gap-4 border-b",
              result.passed
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl",
                result.passed ? "bg-emerald-100" : "bg-red-100"
              )}
            >
              {result.passed ? "🎉" : "😅"}
            </div>
            <div>
              <p className={cn("font-bold text-base leading-tight", result.passed ? "text-emerald-800" : "text-red-700")}>
                {result.score}/{result.total} Benar{" "}
                <span className="font-normal text-sm">({pct}%)</span>
              </p>
              <p className={cn("text-xs mt-0.5", result.passed ? "text-emerald-700" : "text-red-600")}>
                {result.passed
                  ? "Selamat! Kamu lulus mini quiz ini."
                  : `Butuh minimal ${Math.ceil(result.total * 0.6)} jawaban benar untuk lulus.`}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="px-5 py-4 space-y-3">
            {questions.map((q, qi) => {
              const r = result.results[qi]
              return (
                <div
                  key={qi}
                  className={cn(
                    "rounded-lg border p-3.5 text-sm",
                    r.correct ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"
                  )}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    {r.correct
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                    <p className="font-medium leading-snug text-xs">{q.question}</p>
                  </div>
                  {!r.correct && (
                    <p className="text-xs text-muted-foreground ml-5 mb-1">
                      Jawaban benar:{" "}
                      <span className="font-medium text-foreground">{q.options[r.correctIndex]}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground ml-5">{r.explanation}</p>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-3 flex-wrap">
            {result.passed ? (
              <>
                {canAccessExercise ? (
                  <Link
                    href={`/learn/${trackSlug}/${moduleId}/${topicId}/test`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Latihan Coding
                  </Link>
                ) : (
                  <Link
                    href="/credits"
                    className="inline-flex items-center gap-1.5 rounded-md border border-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Top-up untuk Latihan
                  </Link>
                )}
                <Button size="sm" onClick={goToNext} disabled={nextLoading}>
                  {nextLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Topik Berikutnya
                  {!nextLoading && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={startQuiz}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Coba Lagi (soal baru)
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
