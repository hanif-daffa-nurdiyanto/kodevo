"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@kodevo/ui/button"
import { ArrowRight, Coins, Loader2 } from "lucide-react"

type Suggestion = { label: string; icon: string; goal: string; count: number }

const FALLBACK: Suggestion[] = [
  { label: "Python",          icon: "🐍", goal: "Python dari nol sampai bisa",                     count: 0 },
  { label: "Web Development", icon: "🌐", goal: "Web development dengan HTML, CSS, dan JavaScript", count: 0 },
  { label: "Data Science",    icon: "📊", goal: "Data Science dengan Python",                       count: 0 },
  { label: "React",           icon: "⚛️", goal: "React dari nol untuk pemula",                      count: 0 },
  { label: "SQL",             icon: "🗄️", goal: "SQL dan database relasional dari dasar",           count: 0 },
  { label: "TypeScript",      icon: "🔷", goal: "TypeScript dari dasar hingga mahir",               count: 0 },
  { label: "Algoritma",       icon: "🧩", goal: "Algoritma dan struktur data",                      count: 0 },
  { label: "Node.js",         icon: "⚡", goal: "Backend dengan Node.js dan Express",               count: 0 },
]

const LOADING_STEPS = [
  "Menganalisis tujuan belajarmu...",
  "Merancang struktur kurikulum...",
  "Menyusun modul dan topik...",
  "Menyelesaikan kurikulum personalmu...",
]

export function CurriculumGenerator({
  initialGoal = "",
  screenedGoal = "",
}: {
  initialGoal?: string
  screenedGoal?: string
}) {
  const router = useRouter()
  const [goal, setGoal] = useState(initialGoal)
  const [loading, setLoading] = useState(false)
  const [loadingGoal, setLoadingGoal] = useState("")
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [needsCredit, setNeedsCredit] = useState(false)
  const [suggested, setSuggested] = useState<Suggestion[]>(FALLBACK)

  useEffect(() => {
    fetch("/api/trends/topics")
      .then((r) => r.json())
      .then((data: Suggestion[]) => { if (data.length >= 4) setSuggested(data.slice(0, 8)) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 5000)
    return () => clearInterval(id)
  }, [loading])

  async function generate(inputGoal: string) {
    const trimmed = inputGoal.trim()
    if (!trimmed || loading) return
    if (screenedGoal.trim() !== trimmed) {
      router.push(`/screening?goal=${encodeURIComponent(trimmed)}`)
      return
    }

    setStep(0)
    setLoading(true)
    setLoadingGoal(trimmed)
    setError("")
    setNeedsCredit(false)

    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 402) setNeedsCredit(true)
        throw new Error(data.error ?? "Credit tidak cukup untuk membuat kurikulum.")
      }
      router.push(`/learn/${data.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit tidak cukup untuk membuat kurikulum.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/60 bg-white px-6 py-10 text-center text-foreground shadow-[0_18px_36px_rgba(26,26,46,0.12)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <p className="font-semibold text-base">{LOADING_STEPS[step]}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          untuk <span className="font-medium text-foreground">&quot;{loadingGoal}&quot;</span>
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Biasanya 10–20 detik</p>
        <div className="mt-5 flex justify-center gap-1.5">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= step ? "w-6 bg-primary" : "w-2 bg-primary/20"
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate(goal)}
          placeholder="contoh: Python untuk analisis data, membuat REST API, belajar React..."
          className="h-12 flex-1 rounded-lg border border-white bg-white px-5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-white focus:ring-4 focus:ring-white/25"
          autoFocus
        />
        <button
          onClick={() => generate(goal)}
          disabled={!goal.trim()}
          // size="lg"
          className="flex h-12 shrink-0 items-center justify-center rounded-lg bg-kodevo-dark px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 cursor-pointer"
        >
          Buatkan Roadmap
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            {needsCredit && (
              <Button
                size="sm"
                onClick={() => { window.location.href = "/credits" }}
                className="h-8"
              >
                <Coins className="h-3.5 w-3.5" />
                Top-up Credit
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {suggested.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setGoal(s.goal)
              generate(s.goal)
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-sm text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-foreground focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <span className="text-base leading-none">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
