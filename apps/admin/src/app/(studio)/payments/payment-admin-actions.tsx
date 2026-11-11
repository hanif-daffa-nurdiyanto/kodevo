"use client"

import { useState } from "react"
import { CheckCircle, Loader2, Save, Wallet } from "lucide-react"

type BundleFormItem = {
  id: string
  title: string
  description: string
  icon: string | null
  priceIdr: number | null
  hasCertificate: boolean
}

function toInt(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

export function CreditAdjustmentForm() {
  const [email, setEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/payments/credit-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount: toInt(amount), reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Gagal membuat adjustment")
      setResult(`Saldo ${data.user.email} menjadi ${Number(data.balanceAfter).toLocaleString("id-ID")} credit`)
      setEmail("")
      setAmount("")
      setReason("")
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat adjustment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Email user</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@kodevo.id"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="+100 / -25"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Reason</label>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Manual correction, refund, support compensation..."
          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          required
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{result}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        Adjust Credit
      </button>
    </form>
  )
}

export function BundleConfigForm({ bundle }: { bundle: BundleFormItem }) {
  const [form, setForm] = useState({
    title: bundle.title,
    description: bundle.description,
    icon: bundle.icon ?? "",
    priceIdr: String(bundle.priceIdr ?? 0),
    hasCertificate: bundle.hasCertificate,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/admin/payments/bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          icon: form.icon || null,
          priceIdr: toInt(form.priceIdr),
          hasCertificate: form.hasCertificate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Gagal menyimpan bundle")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bundle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
      <div className="grid gap-3 md:grid-cols-[0.4fr_1fr_0.8fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Icon</label>
          <input
            value={form.icon}
            onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Price IDR</label>
          <input
            type="number"
            value={form.priceIdr}
            onChange={(event) => setForm((current) => ({ ...current, priceIdr: event.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            min={0}
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="min-h-20 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          required
        />
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={form.hasCertificate}
          onChange={(event) => setForm((current) => ({ ...current, hasCertificate: event.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        Certificate enabled
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
        {saved ? "Saved" : "Save Bundle"}
      </button>
    </form>
  )
}
