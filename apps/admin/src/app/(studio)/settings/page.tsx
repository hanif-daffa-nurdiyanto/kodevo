"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, CheckCircle, Mail, Send } from "lucide-react"

type Settings = {
  payment_provider: string
  mayar_plus_monthly_url: string
  mayar_plus_annual_url: string
  mayar_pro_monthly_url: string
  mayar_pro_annual_url: string
}

const DEFAULT: Settings = {
  payment_provider: "stripe",
  mayar_plus_monthly_url: "",
  mayar_plus_annual_url: "",
  mayar_pro_monthly_url: "",
  mayar_pro_annual_url: "",
}

export default function StudioSettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailTesting, setEmailTesting] = useState<string | null>(null)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setForm({ ...DEFAULT, ...data }))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof Settings, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleTestEmail(type: "welcome" | "receipt") {
    setEmailTesting(type)
    setEmailResult(null)
    try {
      const res = await fetch("/api/studio/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailResult({ ok: true, msg: `Terkirim ke ${data.sentTo}` })
      } else {
        setEmailResult({ ok: false, msg: data.error ?? "Gagal kirim email" })
      }
    } catch {
      setEmailResult({ ok: false, msg: "Network error" })
    } finally {
      setEmailTesting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold">App Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Konfigurasi payment dan integrasi tanpa redeploy.</p>
      </div>

      {/* Payment Provider */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment Provider</h2>
        <div className="flex gap-3">
          {(["mayar", "stripe"] as const).map((p) => (
            <button
              key={p}
              onClick={() => set("payment_provider", p)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                form.payment_provider === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {p === "mayar" ? "Mayar" : "Stripe"}
            </button>
          ))}
        </div>
      </section>

      {/* Mayar URLs */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mayar Payment Links</h2>
        <div className="space-y-3">
          {([
            { key: "mayar_plus_monthly_url", label: "Plus Bulanan" },
            { key: "mayar_plus_annual_url",  label: "Plus Tahunan" },
            { key: "mayar_pro_monthly_url",  label: "Pro Bulanan" },
            { key: "mayar_pro_annual_url",   label: "Pro Tahunan" },
          ] as { key: keyof Settings; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type="url"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder="https://ul-xxxxx.myr.id/pl/..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Kosongkan jika produk belum tersedia. Kosong berarti tombol di billing page akan error saat diklik.
        </p>
      </section>

      {/* Email Test */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {([
            { type: "welcome", label: "Welcome Email" },
            { type: "receipt", label: "Receipt Email" },
          ] as const).map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleTestEmail(type)}
              disabled={!!emailTesting}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {emailTesting === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {emailTesting === type ? "Mengirim..." : label}
            </button>
          ))}
          {emailResult && (
            <span className={`text-sm flex items-center gap-1.5 ${emailResult.ok ? "text-emerald-600" : "text-red-500"}`}>
              {emailResult.ok ? <CheckCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {emailResult.msg}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Kirim test email ke email admin untuk cek template.</p>
      </section>

      {/* Save */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "Tersimpan!" : "Simpan Perubahan"}
      </button>
    </div>
  )
}
