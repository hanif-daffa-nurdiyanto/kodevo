"use client"

import { useState } from "react"
import { Loader2, CheckCircle, XCircle, Search, Zap } from "lucide-react"

type DebugResult = {
  topicTitle: string
  steps: {
    keywordMatch: string | null
    forceSerp: boolean
    classifierResult: string
    needsSerp: boolean
    searchQuery: string | null
    serpFetched: boolean
    serpSuccess: boolean
    serpPreview: string | null
  }
}

export default function StudioDebugPage() {
  const [topicTitle, setTopicTitle] = useState("")
  const [objective, setObjective] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTest() {
    if (!topicTitle.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/studio/debug-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicTitle, learningObjective: objective }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Debug Material Generation</h1>
        <p className="mt-1 text-sm text-gray-500">Cek apakah keyword filter, classifier, dan Tavily SERP berjalan dengan benar untuk suatu topik.</p>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Topic Title</label>
          <input
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="contoh: Vibe Coding menggunakan Claude Code"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Learning Objective (opsional)</label>
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="contoh: Mampu menggunakan Claude Code untuk coding sehari-hari"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          onClick={handleTest}
          disabled={loading || !topicTitle.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Mengecek..." : "Test Flow"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Step 1: Keyword */}
          <div className={`rounded-lg border px-4 py-3 ${result.steps.forceSerp ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`h-4 w-4 ${result.steps.forceSerp ? "text-amber-500" : "text-gray-300"}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 1 — Keyword Pre-filter</span>
            </div>
            {result.steps.keywordMatch
              ? <p className="text-sm text-amber-700">Match: <code className="bg-amber-100 px-1 rounded">{result.steps.keywordMatch}</code> → Force SERP aktif, skip classifier</p>
              : <p className="text-sm text-gray-500">Tidak ada keyword match → lanjut ke classifier</p>
            }
          </div>

          {/* Step 2: Classifier */}
          {!result.steps.forceSerp && (
            <div className="rounded-lg border px-4 py-3 bg-gray-50 border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                {result.steps.classifierResult.includes("✓")
                  ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                  : <XCircle className="h-4 w-4 text-red-400" />
                }
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 2 — Classifier (8B)</span>
              </div>
              <p className="text-sm text-gray-700">{result.steps.classifierResult}</p>
            </div>
          )}

          {/* Search Query */}
          {result.steps.searchQuery && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Query dikirim ke Tavily</p>
              <code className="text-sm text-blue-800">{result.steps.searchQuery}</code>
            </div>
          )}

          {/* Step 3: SERP */}
          <div className={`rounded-lg border px-4 py-3 ${result.steps.needsSerp ? (result.steps.serpSuccess ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200") : "bg-gray-50 border-gray-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Search className={`h-4 w-4 ${!result.steps.needsSerp ? "text-gray-300" : result.steps.serpSuccess ? "text-emerald-500" : "text-red-400"}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 3 — Tavily SERP</span>
            </div>
            {!result.steps.needsSerp
              ? <p className="text-sm text-gray-500">Tidak diperlukan — LLM dianggap confident</p>
              : result.steps.serpSuccess
              ? <p className="text-sm text-emerald-700">Berhasil fetch web context ✓</p>
              : <p className="text-sm text-red-600">Gagal — Tavily tidak mengembalikan hasil (cek API key atau limit)</p>
            }
          </div>

          {/* SERP Preview */}
          {result.steps.serpPreview && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview Hasil SERP (500 char pertama)</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{result.steps.serpPreview}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
