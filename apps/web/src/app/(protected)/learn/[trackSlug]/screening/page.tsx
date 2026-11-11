"use client"

import { useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@kodevo/ui/button"
import { Textarea } from "@kodevo/ui/textarea"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Loader2, ChevronRight } from "lucide-react"
import { cn } from "@kodevo/utils"
import { getTrackScreeningQuestions } from "@/lib/track-screening-questions"
import type { ScreeningQuestion } from "@/types"

const levelLabels: Record<string, { label: string; emoji: string; desc: string; bg: string; color: string }> = {
  BEGINNER: {
    label: "Explorer",
    emoji: "🧭",
    desc: "Baru kenal dunia digital dan AI. Kami mulai dari fundamental biar dasarmu kuat.",
    bg: "bg-[#F0FDF4]",
    color: "text-[#00A88A]",
  },
  MID: {
    label: "Builder",
    emoji: "🔨",
    desc: "Sudah familiar dan mau go deeper. Kami skip bagian basic biar kamu lebih cepat sampai.",
    bg: "bg-[#EFF6FF]",
    color: "text-[#3D8EF0]",
  },
  ADVANCE: {
    label: "Creator",
    emoji: "🚀",
    desc: "Kamu sudah bisa build sesuatu. Kami bawa kamu langsung ke materi advanced.",
    bg: "bg-[#FEF9C3]",
    color: "text-[#D97706]",
  },
}

type Phase = "quiz" | "submitting" | "result"

interface Result {
  level: "BEGINNER" | "MID" | "ADVANCE"
  score: number
  explanation: string
}

interface ScreeningConfig {
  trackName: string
  questions: ScreeningQuestion[]
}

export default function TrackScreeningPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>
}) {
  const { trackSlug } = use(params)
  const router = useRouter()
  const fallbackConfig = useMemo(() => getTrackScreeningQuestions(trackSlug), [trackSlug])
  const [config, setConfig] = useState<ScreeningConfig>(fallbackConfig)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const questions = config.questions

  const [phase, setPhase] = useState<Phase>("quiz")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")

  const total = questions.length
  const current = questions[currentIndex]
  const currentAnswer = answers[current?.id ?? ""] ?? ""

  useEffect(() => {
    let cancelled = false

    async function loadQuestions() {
      setLoadingQuestions(true)
      setError("")
      try {
        const res = await fetch(`/api/track-screening/questions?slug=${encodeURIComponent(trackSlug)}`)
        const data = await res.json()
        if (data.disabled && typeof data.redirectTo === "string") {
          router.replace(data.redirectTo)
          return
        }
        if (!res.ok || !Array.isArray(data.questions)) throw new Error(data.error ?? "Gagal memuat pertanyaan")
        if (cancelled) return

        setConfig({
          trackName: typeof data.trackName === "string" && data.trackName.trim() ? data.trackName : fallbackConfig.trackName,
          questions: data.questions,
        })
        setCurrentIndex(0)
        setAnswers({})
      } catch {
        if (cancelled) return
        setConfig(fallbackConfig)
        setError("Pertanyaan dinamis belum tersedia. Kamu tetap bisa lanjut dengan pertanyaan fallback.")
      } finally {
        if (!cancelled) setLoadingQuestions(false)
      }
    }

    loadQuestions()

    return () => {
      cancelled = true
    }
  }, [trackSlug, fallbackConfig, router])

  function handleAnswer(value: string) {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (!currentAnswer) return
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      handleSubmit()
    }
  }

  async function handleSubmit() {
    setPhase("submitting")
    setError("")

    try {
      const trackRes = await fetch(`/api/track-screening/track-id?slug=${trackSlug}`)
      const trackData = await trackRes.json()
      if (!trackData.id) throw new Error("Track tidak ditemukan")

      const payload = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        userAnswer: answers[q.id] ?? "",
        correctAnswer: q.correctAnswer,
        type: q.type,
      }))

      const res = await fetch("/api/track-screening/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: trackData.id, answers: payload }),
      })

      if (!res.ok) throw new Error("Gagal mengevaluasi")

      const data = await res.json()
      setResult(data)
      setPhase("result")
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
      setPhase("quiz")
    }
  }

  const dots = Array.from({ length: total }, (_, i) => i)

  if (loadingQuestions) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">Menyiapkan screening sesuai track...</p>
      </div>
    )
  }

  if (phase === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">AI sedang mengevaluasi jawabanmu...</p>
      </div>
    )
  }

  if (phase === "result" && result) {
    const levelInfo = levelLabels[result.level]
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between px-5 py-5 md:px-12">
          <Link href={`/learn/${trackSlug}`} className="text-sm font-semibold text-muted-foreground hover:text-primary">
            ← Semua Track
          </Link>
          <span className="text-right text-[13px] font-semibold text-muted-foreground">Selesai</span>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="max-w-[460px] text-center">
            <div className={cn("mx-auto mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full text-4xl", levelInfo.bg)}>
              {levelInfo.emoji}
            </div>
            <div className={cn("mb-4 inline-flex rounded-full px-4 py-1.5 text-[13px] font-bold", levelInfo.bg, levelInfo.color)}>
              Level {levelInfo.label}
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight">Kamu mulai sebagai {levelInfo.label}</h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{result.explanation || levelInfo.desc}</p>
            <p className="mt-2 text-sm text-muted-foreground">Skor: <span className="font-bold text-foreground">{result.score}/100</span></p>
            <Button size="lg" className="mt-8 h-12 px-8" onClick={() => router.push(`/learn/${trackSlug}`)}>
              Mulai Belajar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-12">
        <button
          type="button"
          onClick={() => router.push(`/learn/${trackSlug}?skip=1`)}
          className="text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          ← Batalkan
        </button>
        <div className="flex items-center gap-1.5">
          {dots.map((dot) => (
            <span
              key={dot}
              className={cn(
                "h-1.5 rounded-full transition-all",
                dot === currentIndex ? "w-7 kodevo-gradient" : dot < currentIndex ? "w-[18px] kodevo-gradient" : "w-[18px] bg-muted"
              )}
            />
          ))}
        </div>
        <span className="min-w-[70px] text-right text-[13px] font-semibold text-muted-foreground">
          {currentIndex + 1} dari {total}
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[520px]">
          <div className="mb-3 text-[13px] font-bold text-primary">Screening · {config.trackName}</div>
          <h1 className="mb-8 text-[26px] font-extrabold leading-[1.4]">{current?.question}</h1>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {current?.type === "mcq" && current.options ? (
            <div className="mb-8 flex flex-col gap-2.5">
              {current.options.map((option) => {
                const selected = currentAnswer === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] border px-[18px] py-4 text-left text-[15px] transition-all hover:translate-x-0.5",
                      selected ? "border-2 border-kodevo-green bg-[#F0FDF4]" : "border-[#E5E7EB] bg-white"
                    )}
                  >
                    <span className={cn("h-[18px] w-[18px] shrink-0 rounded-full border-2", selected ? "border-kodevo-green bg-kodevo-green" : "border-[#D1D5DB]")} />
                    <span>{option}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mb-8">
              <Textarea
                placeholder="Ketik jawabanmu di sini..."
                value={currentAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                rows={5}
                className="resize-none rounded-[10px] border-[#E5E7EB] text-[15px] leading-7"
              />
              <p className="mt-2 text-xs text-muted-foreground">Tulis penjelasan sesuai pemahamanmu.</p>
            </div>
          )}

          <div className="flex gap-3">
            {currentIndex > 0 && (
              <Button variant="outline" className="h-12 px-6" onClick={() => setCurrentIndex((i) => i - 1)}>
                Kembali
              </Button>
            )}
            <Button className="h-12 flex-1" onClick={handleNext} disabled={!currentAnswer}>
              {currentIndex === total - 1 ? "Lihat Hasil" : "Lanjut"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
