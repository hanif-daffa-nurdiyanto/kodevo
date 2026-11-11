"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button, buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { Badge } from "@kodevo/ui/badge"
import { cn } from "@kodevo/utils"
import {
  ChevronLeft, Loader2, CheckCircle2, XCircle,
  Code2, ArrowRight, Lock, Trophy, AlertCircle, RefreshCw,
} from "lucide-react"

type QuizQuestion = {
  question: string
  options: [string, string, string, string]
  answer: number
  explanation: string
}

type Challenge = {
  prompt: string
  requirements: string[]
  starterCode: Record<string, string>
  language: string
}

type AttemptStatus = {
  passed: boolean
  todayAttempts: number
  dailyLimit: number
  canAttempt: boolean
  latestAttempt: {
    quizPassed: boolean
    quizScore: number | null
    challengePassed: boolean
    challengeFeedback: string | null
    passed: boolean
    createdAt: string
  } | null
}

type Stage = "loading" | "not-ready" | "intro" | "quiz" | "quiz-result" | "challenge" | "challenge-result" | "done"

export default function ModuleAssessmentPage() {
  const params = useParams()
  const trackSlug = params.trackSlug as string
  const moduleId = params.moduleId as string

  const [stage, setStage] = useState<Stage>("loading")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [status, setStatus] = useState<AttemptStatus | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<{
    score: number
    quizPassed: boolean
    attemptId: string
    details: Array<{ isCorrect: boolean; correctAnswer: number; yourAnswer: number }>
  } | null>(null)
  const [code, setCode] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [challengeResult, setChallengeResult] = useState<{
    challengePassed: boolean
    allPassed: boolean
    feedback: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const generatingAssessmentRef = useRef(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAssessment() }, [moduleId])

  async function loadAssessment() {
    setStage("loading")
    setError(null)

    let res: Response
    try {
      res = await fetch(`/api/module-assessment/${moduleId}`)
    } catch {
      setError("Gagal memuat assessment. Coba lagi.")
      setStage("not-ready")
      return
    }

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Gagal memuat assessment.")
      setStage("not-ready")
      return
    }

    if (!data.assessment) {
      if (!generatingAssessmentRef.current) {
        generatingAssessmentRef.current = true
        const generated = await generateAssessment()
        generatingAssessmentRef.current = false
        if (generated) {
          await loadAssessment()
          return
        }
      }
      setStage("not-ready")
      return
    }

    setQuestions(data.assessment.quizQuestions as QuizQuestion[])
    setChallenge(data.assessment.challenge as Challenge)
    setStatus(data.status)
    setCode((data.assessment.challenge as Challenge).starterCode ?? {})

    if (data.status.passed) {
      setStage("done")
    } else if (!data.status.canAttempt) {
      setStage("not-ready")
    } else {
      setStage("intro")
      setSelectedAnswers([])
      setCurrentQ(0)
    }
  }

  async function generateAssessment() {
    setError(null)
    try {
      const res = await fetch(`/api/module-assessment/${moduleId}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat assessment.")
        return false
      }
      return true
    } catch {
      setError("Gagal membuat assessment. Coba lagi.")
      return false
    }
  }

  function handleSelectAnswer(idx: number) {
    const next = [...selectedAnswers]
    next[currentQ] = idx
    setSelectedAnswers(next)
  }

  async function submitQuiz() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/module-assessment/${moduleId}/submit-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selectedAnswers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setQuizResult(data)
      setStage("quiz-result")
    } catch {
      setError("Gagal mengirim jawaban. Coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitChallenge() {
    if (!quizResult) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/module-assessment/${moduleId}/submit-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: quizResult.attemptId, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSubmitting(false); return }
      setChallengeResult(data)
      setStage("challenge-result")
    } catch {
      setError("Gagal submit challenge. Coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (stage === "not-ready") {
    const limitReached = status && status.todayAttempts >= status.dailyLimit && !status.passed
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Link href={`/learn/${trackSlug}/${moduleId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6")}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali ke Modul
        </Link>
        <Card className="text-center p-8">
          {limitReached ? (
            <>
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Batas Percobaan Hari Ini</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Kamu sudah mencoba {status?.todayAttempts}x hari ini. Assessment bisa diulang besok.
              </p>
              <p className="text-xs text-muted-foreground">Batas: {status?.dailyLimit}x per hari</p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <h2 className="text-lg font-semibold mb-2">Assessment Sedang Disiapkan</h2>
              <p className="text-muted-foreground text-sm mb-4">
                AI sedang membuat soal assessment untuk modul ini. Biasanya selesai dalam 1-2 menit.
              </p>
              {error && (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button variant="outline" onClick={loadAssessment}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Cek lagi
              </Button>
            </>
          )}
        </Card>
      </div>
    )
  }

  if (stage === "done") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Link href={`/learn/${trackSlug}/${moduleId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6")}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali ke Modul
        </Link>
        <Card className="text-center p-8 border-emerald-200 bg-emerald-50/50">
          <Trophy className="h-14 w-14 mx-auto mb-4 text-emerald-500" />
          <h2 className="text-xl font-bold mb-2 text-emerald-700">Assessment Selesai!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Kamu sudah lulus assessment modul ini. Lanjutkan ke modul berikutnya.
          </p>
          <Link
            href={`/learn/${trackSlug}`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Lihat Modul Berikutnya
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Card>
      </div>
    )
  }

  const allAnswered = selectedAnswers.length === questions.length && selectedAnswers.every((a) => a !== undefined)
  const stepCount = questions.length + 1
  const activeStep =
    stage === "intro"
      ? -1
      : stage === "quiz"
      ? currentQ
      : stage === "quiz-result" || stage === "challenge"
      ? questions.length
      : stepCount

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-5 md:px-12">
        <Link href={`/learn/${trackSlug}/${moduleId}`} className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Batalkan
        </Link>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeStep ? "w-7 kodevo-gradient" : i < activeStep ? "w-[18px] kodevo-gradient" : "w-[18px] bg-muted"
              )}
            />
          ))}
        </div>
        <span className="min-w-[80px] text-right text-[13px] font-semibold text-muted-foreground">
          {stage === "intro"
            ? "Mulai"
            : stage === "quiz"
            ? `${currentQ + 1} dari ${questions.length}`
            : stage === "challenge"
            ? "Challenge"
            : "Selesai"}
        </span>
      </header>
      <main className="flex flex-1 justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[640px]">
      {stage === "intro" && (
        <div className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EFF6FF] text-3xl">
            📝
          </div>
          <div className="mb-2 text-[13px] font-bold text-primary">Module Assessment</div>
          <h1 className="text-[28px] font-extrabold leading-tight">Uji Pemahaman Modul</h1>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            {questions.length} soal quiz + 1 coding challenge. Butuh nilai minimal 70% buat lulus modul ini.
          </p>
          <div className="my-8 flex justify-center gap-8">
            <div>
              <div className="text-xl font-extrabold">{questions.length}</div>
              <div className="text-xs text-muted-foreground">Soal Quiz</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">1</div>
              <div className="text-xs text-muted-foreground">Coding Challenge</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">~15</div>
              <div className="text-xs text-muted-foreground">Menit</div>
            </div>
          </div>
          {status && (
            <Badge variant="outline" className="mb-5">
              Percobaan hari ini: {status.todayAttempts}/{status.dailyLimit}
            </Badge>
          )}
          <Button size="lg" className="h-12 px-8" onClick={() => setStage("quiz")}>
            Mulai Assessment
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stage: Quiz */}
      {stage === "quiz" && (
        <div className="mx-auto w-full max-w-[520px] py-8">
          <div className="mb-3 text-[13px] font-bold text-primary">Quiz · Soal {currentQ + 1} dari {questions.length}</div>
          <h1 className="mb-7 text-[24px] font-extrabold leading-[1.4]">{questions[currentQ]?.question}</h1>
          <div className="mb-8 flex flex-col gap-2.5">
            {questions[currentQ]?.options.map((opt, i) => {
              const selected = selectedAnswers[currentQ] === i
              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] border px-[18px] py-4 text-left transition-all hover:translate-x-0.5",
                    selected ? "border-2 border-kodevo-green bg-[#F0FDF4]" : "border-[#E5E7EB] bg-white"
                  )}
                >
                  <span className={cn("h-[18px] w-[18px] shrink-0 rounded-full border-2", selected ? "border-kodevo-green bg-kodevo-green" : "border-[#D1D5DB]")} />
                  <span className="font-mono text-sm">{opt}</span>
                </button>
              )
            })}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              className="h-12 px-6"
              disabled={currentQ === 0}
              onClick={() => setCurrentQ((q) => q - 1)}
            >
              Kembali
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button
                className="h-12 px-6"
                disabled={selectedAnswers[currentQ] === undefined}
                onClick={() => setCurrentQ((q) => q + 1)}
              >
                Lanjut
              </Button>
            ) : (
              <Button
                className="h-12 px-6"
                disabled={!allAnswered || submitting}
                onClick={submitQuiz}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Lanjut ke Challenge
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Stage: Quiz Result */}
      {stage === "quiz-result" && quizResult && (
        <div className="mx-auto w-full max-w-[640px] space-y-6 py-8">
          <Card className={cn("border", quizResult.quizPassed ? "border-emerald-200 bg-[#F0FDF4]" : "border-orange-200 bg-orange-50/50")}>
            <CardContent className="p-6 text-center">
              {quizResult.quizPassed ? (
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              ) : (
                <XCircle className="h-10 w-10 mx-auto mb-3 text-orange-500" />
              )}
              <p className="text-2xl font-bold mb-1">{quizResult.score}%</p>
              <p className={cn("text-sm font-medium", quizResult.quizPassed ? "text-emerald-700" : "text-orange-700")}>
                {quizResult.quizPassed ? "Quiz Lulus! Lanjut ke Coding Challenge." : "Belum lulus. Minimal 70%."}
              </p>
            </CardContent>
          </Card>

          {/* Answer review */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Review Jawaban</p>
            {questions.map((q, i) => {
              const d = quizResult.details[i]
              return (
                <Card key={i} className={cn("border", d.isCorrect ? "border-emerald-200" : "border-red-200")}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2">{i + 1}. {q.question}</p>
                    <p className={cn("text-xs mb-1", d.isCorrect ? "text-emerald-700" : "text-red-600")}>
                      Jawabanmu: {q.options[d.yourAnswer]} {d.isCorrect ? "✓" : "✗"}
                    </p>
                    {!d.isCorrect && (
                      <p className="text-xs text-emerald-700">Jawaban benar: {q.options[d.correctAnswer]}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {quizResult.quizPassed ? (
            <Button className="w-full" onClick={() => setStage("challenge")}>
              Lanjut ke Coding Challenge <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Pelajari ulang materi modul ini, lalu coba lagi.
              </p>
              <Link
                href={`/learn/${trackSlug}/${moduleId}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Kembali ke Modul
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stage: Challenge */}
      {stage === "challenge" && challenge && (
        <div className="mx-auto w-full max-w-[640px] space-y-6 py-8">
          <div>
            <div className="mb-3 text-[13px] font-bold text-primary">Coding Challenge</div>
            <h1 className="text-[24px] font-extrabold leading-tight">Selesaikan challenge akhir</h1>
          </div>

          <Card className="border-[#F3F4F6]">
            <CardContent className="p-5">
              <p className="mb-3 text-sm leading-7">{challenge.prompt}</p>
              <ul className="space-y-1">
                {challenge.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-xl border border-[#1A1A2E]">
            {Object.entries(challenge.starterCode).map(([filename, content]) => (
              <div key={filename}>
                <div className="flex h-10 items-center gap-2 bg-[#1A1A2E] px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00C9A7]" />
                  <span className="ml-2 font-mono text-xs text-[#9CA3AF]">{filename}</span>
                </div>
                <textarea
                  className="min-h-[260px] w-full resize-y border-0 bg-[#16162a] p-4 font-mono text-sm leading-7 text-[#E5E7EB] focus:outline-none"
                  defaultValue={content}
                  onChange={(e) => setCode((prev) => ({ ...prev, [filename]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button className="w-full" disabled={submitting} onClick={submitChallenge}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
            Submit & Evaluasi
          </Button>
        </div>
      )}

      {/* Stage: Challenge Result */}
      {stage === "challenge-result" && challengeResult && (
        <div className="mx-auto flex min-h-[60vh] w-full max-w-[460px] flex-col items-center justify-center space-y-6 text-center">
          <Card className={cn("w-full border", challengeResult.allPassed ? "border-emerald-200 bg-[#F0FDF4]" : "border-orange-200 bg-orange-50/50")}>
            <CardContent className="p-6 text-center">
              {challengeResult.allPassed ? (
                <Trophy className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
              ) : (
                <XCircle className="h-10 w-10 mx-auto mb-3 text-orange-500" />
              )}
              <p className={cn("text-lg font-bold mb-1", challengeResult.allPassed ? "text-emerald-700" : "text-orange-700")}>
                {challengeResult.allPassed ? "Assessment Lulus! 🎉" : "Challenge Belum Lulus"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{challengeResult.feedback}</p>
            </CardContent>
          </Card>

          {challengeResult.allPassed ? (
            <Link href={`/learn/${trackSlug}`} className={cn(buttonVariants({ variant: "default" }), "w-full justify-center")}>
              Lanjut ke Modul Berikutnya <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Perbaiki kode kamu dan coba lagi.</p>
              <Button variant="outline" onClick={() => setStage("challenge")}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      )}
        </div>
      </main>
    </div>
  )
}
