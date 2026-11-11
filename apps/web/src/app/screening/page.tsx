"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@kodevo/ui/button"
import { Textarea } from "@kodevo/ui/textarea"
import { screeningQuestions } from "@/lib/screening-questions"
import { cn } from "@kodevo/utils"
import type { ScreeningQuestion } from "@/types"

const LEVEL_INFO: Record<string, { title: string; desc: string; icon: string; bg: string; color: string }> = {
  BEGINNER: {
    title: "Explorer",
    desc: "Baru kenal dunia digital dan AI. Kami mulai dari fundamental biar dasarmu kuat.",
    icon: "🧭",
    bg: "bg-[#F0FDF4]",
    color: "text-[#00A88A]",
  },
  MID: {
    title: "Builder",
    desc: "Sudah familiar dan mau go deeper. Kami skip bagian basic biar kamu lebih cepat sampai.",
    icon: "🔨",
    bg: "bg-[#EFF6FF]",
    color: "text-[#3D8EF0]",
  },
  ADVANCE: {
    title: "Creator",
    desc: "Kamu sudah bisa build sesuatu. Kami bawa kamu langsung ke materi advanced.",
    icon: "🚀",
    bg: "bg-[#FEF9C3]",
    color: "text-[#D97706]",
  },
}

const STYLE_LABEL: Record<string, string> = {
  READ_FIRST: "Baca dulu, baru praktek",
  CHUNK_QUIZ: "Belajar sambil cek pemahaman",
  CHALLENGE_FIRST: "Langsung tantangan",
}

type Phase = "quiz" | "submitting" | "done"
type DoneData = { level: string; learningStyle: string }

export default function ScreeningPage() {
  return (
    <Suspense fallback={<ScreeningShell />}>
      <ScreeningContent />
    </Suspense>
  )
}

function ScreeningContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const goal = searchParams.get("goal")?.trim() ?? ""
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questionSource, setQuestionSource] = useState<"generated" | "fallback">("generated")
  const [phase, setPhase] = useState<Phase>("quiz")
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<DoneData | null>(null)

  const total = questions.length
  const activeQuestion = questions[step]
  const answer = answers[activeQuestion?.id ?? ""] ?? ""
  const isPreference = activeQuestion?.category === "preference"
  const knowledgeTotal = questions.filter((question) => question.category !== "preference").length
  const dots = Array.from({ length: total }, (_, index) => ({
    active: phase === "done" || phase === "submitting" || (phase === "quiz" && index <= step),
    current: phase === "quiz" && index === step,
  }))
  const stepLabel = phase === "done"
    ? "Selesai"
    : phase === "submitting"
    ? "Memproses"
    : `${step + 1} dari ${total}`

  useEffect(() => {
    if (!goal) {
      router.replace("/learn/new")
      return
    }

    let cancelled = false

    async function loadQuestions() {
      setLoadingQuestions(true)
      try {
        const res = await fetch(`/api/screening/questions?goal=${encodeURIComponent(goal)}`)
        const data = await res.json()
        if (!res.ok || !Array.isArray(data.questions)) throw new Error(data.error ?? "Gagal memuat pertanyaan")
        if (cancelled) return

        setQuestions(data.questions)
        setQuestionSource(data.source === "fallback" ? "fallback" : "generated")
        setStep(0)
        setAnswers({})
      } catch {
        if (cancelled) return
        setQuestions(screeningQuestions)
        setQuestionSource("fallback")
      } finally {
        if (!cancelled) setLoadingQuestions(false)
      }
    }

    loadQuestions()

    return () => {
      cancelled = true
    }
  }, [goal, router])

  function handleSelect(val: string) {
    if (!activeQuestion) return
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: val }))
  }

  async function handleNext() {
    if (!answer) return

    if (step < total - 1) {
      setStep((s) => s + 1)
      return
    }

    setPhase("submitting")

    const res = await fetch("/api/screening/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, questions, goal }),
    })

    const data = await res.json()
    setResult({ level: data.level ?? "BEGINNER", learningStyle: data.learningStyle ?? "READ_FIRST" })
    setPhase("done")
  }

  if (loadingQuestions) {
    return (
      <ScreeningShell label="Menyiapkan pertanyaan sesuai materi..." />
    )
  }

  if (phase === "submitting") {
    return (
      <ScreenFrame dots={dots} stepLabel={stepLabel}>
        <div className="flex min-h-[calc(100vh-76px)] flex-col items-center justify-center px-6 text-center">
          <div className="kodevo-gradient mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-normal">Roadmap kamu lagi disiapkan</h1>
          <p className="mt-3 max-w-[420px] text-[15px] leading-7 text-[#6B7280]">
            Kodevo sedang membaca level dan gaya belajarmu supaya roadmap personalmu dimulai dari titik yang pas.
          </p>
        </div>
      </ScreenFrame>
    )
  }

  if (phase === "done" && result) {
    const levelInfo = LEVEL_INFO[result.level] ?? LEVEL_INFO.BEGINNER
    const styleLabel = STYLE_LABEL[result.learningStyle] ?? STYLE_LABEL.READ_FIRST
    const nextHref = goal ? `/learn/new?goal=${encodeURIComponent(goal)}&screened=1` : "/learn/new"

    return (
      <ScreenFrame dots={dots} stepLabel={stepLabel}>
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-[460px] flex-col items-center justify-center px-6 text-center">
          <div className={cn("mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full text-4xl", levelInfo.bg)}>
            {levelInfo.icon}
          </div>
          <div className={cn("mb-4 inline-flex rounded-full px-3.5 py-1 text-[13px] font-bold", levelInfo.bg, levelInfo.color)}>
            Level {levelInfo.title}
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-normal">Kamu mulai sebagai {levelInfo.title}</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{levelInfo.desc}</p>
          <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
            <ResultPill label="Gaya belajar" value={styleLabel} />
            <ResultPill label="Jalur" value="Roadmap personal" />
          </div>
          <Button size="lg" className="mt-8 h-12 w-full max-w-sm rounded-lg text-[15px]" onClick={() => router.push(nextHref)}>
            Buatkan Roadmap
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </ScreenFrame>
    )
  }

  return (
    <ScreenFrame dots={dots} stepLabel={stepLabel}>
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-8">
        <div className="w-full max-w-[520px] animate-in fade-in zoom-in-95 duration-300">
          {goal && (
            <div className="mb-5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3D8EF0]">Prompt roadmap</p>
              <p className="mt-1 text-sm leading-6 text-[#1A1A2E]">{goal}</p>
            </div>
          )}
          <div className="mb-3 text-[13px] font-bold text-[#3D8EF0]">
            {isPreference
              ? "Roadmap personal - Preferensi belajar"
              : `Roadmap personal - ${knowledgeTotal} pertanyaan materi${questionSource === "fallback" ? " fallback" : ""}`}
          </div>
          <h1 className="mb-8 text-[26px] font-extrabold leading-[1.4] tracking-normal">{activeQuestion?.question}</h1>

          {activeQuestion?.type === "analysis" ? (
            <Textarea
              value={answer}
              onChange={(event) => handleSelect(event.target.value)}
              placeholder="Tulis jawabanmu dengan singkat dan jelas..."
              className="mb-8 min-h-[132px] resize-none rounded-[10px] border-[#E5E7EB] px-[18px] py-4 text-[15px]"
            />
          ) : (
            <div className="mb-8 flex flex-col gap-2.5">
              {activeQuestion?.options?.map((opt) => {
              const selected = answer === opt

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-[10px] border px-[18px] py-4 text-left transition-all hover:translate-x-1",
                    selected ? "border-2 border-[#00C9A7] bg-[#F0FDF4]" : "border-[#E5E7EB] bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 rounded-full border-2",
                      selected ? "border-[#00C9A7] bg-[#00C9A7]" : "border-[#D1D5DB] bg-transparent"
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-[15px] leading-6 text-[#1A1A2E]">{opt}</span>
                </button>
              )
            })}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="h-12 px-6 text-[15px] text-[#6B7280]" onClick={() => (step === 0 ? router.push("/learn") : setStep((s) => s - 1))}>
              Kembali
            </Button>
            <Button className="h-12 flex-1 rounded-lg text-[15px]" onClick={handleNext} disabled={!answer}>
              {step === total - 1 ? "Lihat Hasil" : "Lanjut"}
            </Button>
          </div>
        </div>
      </main>
    </ScreenFrame>
  )
}

function ScreeningShell({ label = "Menyiapkan screening roadmap..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-[#1A1A2E]">
      <div>
        <div className="kodevo-gradient mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-[#6B7280]">{label}</p>
      </div>
    </div>
  )
}

function ScreenFrame({
  children,
  dots,
  stepLabel,
}: {
  children: React.ReactNode
  dots: Array<{ active: boolean; current: boolean }>
  stepLabel: string
}) {
  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-12">
        <Link href="/learn" className="flex min-w-[70px] items-center gap-1 text-sm font-semibold text-[#6B7280] transition-colors hover:text-[#3D8EF0]">
          <span aria-hidden="true">←</span>
          Batalkan
        </Link>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {dots.map((dot, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                dot.current ? "w-7" : "w-[18px]",
                dot.active ? "kodevo-gradient" : "bg-[#F3F4F6]"
              )}
            />
          ))}
        </div>
        <span className="min-w-[70px] text-right text-[13px] font-semibold text-[#6B7280]">{stepLabel}</span>
      </header>
      {children}
    </div>
  )
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#F3F4F6] bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">{value}</p>
    </div>
  )
}
