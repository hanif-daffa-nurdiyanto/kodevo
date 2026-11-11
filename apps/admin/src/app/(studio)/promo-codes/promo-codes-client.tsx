"use client"

import { useState } from "react"
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from "lucide-react"
import { Button } from "@kodevo/ui/button"
import { Input } from "@kodevo/ui/input"

type PromoType = "PERCENT_OFF" | "AMOUNT_OFF" | "FREE_PLUS" | "FREE_PRO"
type PromoTarget = "ALL" | "CREDIT" | "BUNDLE"

interface Promo {
  id: string
  code: string
  type: PromoType
  target: PromoTarget
  discountPercent: number | null
  discountAmount: number | null
  minAmountIdr: number | null
  maxDiscountIdr: number | null
  creditPackageId: string | null
  trackId: string | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  description: string | null
  createdAt: string
  _count: { redemptions: number }
}

interface CreditPackageOption {
  id: string
  label: string
  credits: number
  priceIdr: number
}

interface BundleOption {
  id: string
  title: string
  slug: string
  priceIdr: number | null
  isFree: boolean
}

const TYPE_LABELS: Record<PromoType, string> = {
  PERCENT_OFF: "Diskon %",
  AMOUNT_OFF: "Diskon Rp",
  FREE_PLUS: "Legacy",
  FREE_PRO: "Legacy",
}

const TYPE_COLORS: Record<PromoType, string> = {
  PERCENT_OFF: "bg-blue-50 text-blue-700",
  AMOUNT_OFF: "bg-emerald-50 text-emerald-700",
  FREE_PLUS: "bg-amber-50 text-amber-700",
  FREE_PRO: "bg-violet-50 text-violet-700",
}

function fmtDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

const TARGET_LABELS: Record<PromoTarget, string> = {
  ALL: "Semua",
  CREDIT: "Credit",
  BUNDLE: "Bundle",
}

function fmtRp(value: number | null) {
  if (value == null) return "—"
  return `Rp ${value.toLocaleString("id-ID")}`
}

function discountLabel(p: Promo) {
  if (p.type === "PERCENT_OFF") return `${p.discountPercent}%`
  if (p.type === "AMOUNT_OFF") return fmtRp(p.discountAmount)
  return "—"
}

function scopeLabel(p: Promo, creditPackages: CreditPackageOption[], bundles: BundleOption[]) {
  if (p.target === "CREDIT" && p.creditPackageId) {
    const pkg = creditPackages.find((item) => item.id === p.creditPackageId)
    return pkg ? `${pkg.label} (${pkg.credits.toLocaleString("id-ID")} credit)` : "Credit package tertentu"
  }
  if (p.target === "BUNDLE" && p.trackId) {
    const bundle = bundles.find((item) => item.id === p.trackId)
    return bundle ? bundle.title : "Bundle tertentu"
  }
  return p.target === "ALL" ? "Semua credit dan bundle" : `Semua ${TARGET_LABELS[p.target].toLowerCase()}`
}

function parseOptionalInt(value: string) {
  return value.trim() ? parseInt(value, 10) : undefined
}

export function PromoCodesClient({
  initialPromos,
  creditPackages,
  bundles,
}: {
  initialPromos: Promo[]
  creditPackages: CreditPackageOption[]
  bundles: BundleOption[]
}) {
  const [promos, setPromos] = useState<Promo[]>(initialPromos)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT_OFF" as PromoType,
    target: "ALL" as PromoTarget,
    creditPackageId: "",
    trackId: "",
    discountPercent: "",
    discountAmount: "",
    minAmountIdr: "",
    maxDiscountIdr: "",
    maxUses: "",
    expiresAt: "",
    description: "",
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        type: form.type,
        target: form.target,
        description: form.description || undefined,
        maxUses: parseOptionalInt(form.maxUses),
        minAmountIdr: parseOptionalInt(form.minAmountIdr),
        maxDiscountIdr: parseOptionalInt(form.maxDiscountIdr),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }
      if (form.target === "CREDIT" && form.creditPackageId) body.creditPackageId = form.creditPackageId
      if (form.target === "BUNDLE" && form.trackId) body.trackId = form.trackId
      if (form.type === "PERCENT_OFF") body.discountPercent = parseInt(form.discountPercent)
      if (form.type === "AMOUNT_OFF") body.discountAmount = parseInt(form.discountAmount)

      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gagal membuat kode promo")
        return
      }
      setPromos((prev) => [{ ...data.promo, _count: { redemptions: 0 } }, ...prev])
      setForm({
        code: "",
        type: "PERCENT_OFF",
        target: "ALL",
        creditPackageId: "",
        trackId: "",
        discountPercent: "",
        discountAmount: "",
        minAmountIdr: "",
        maxDiscountIdr: "",
        maxUses: "",
        expiresAt: "",
        description: "",
      })
      setShowForm(false)
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) {
      setPromos((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !current } : p))
    }
  }

  async function deletePromo(id: string) {
    if (!confirm("Hapus kode promo ini?")) return
    const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" })
    if (res.ok) setPromos((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-500">{promos.length} kode promo</p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Buat Kode
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
          <p className="text-sm font-semibold">Kode Baru</p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Kode *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER30"
                className="font-mono uppercase text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Tipe *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromoType }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="PERCENT_OFF">Diskon Persen (%)</option>
                <option value="AMOUNT_OFF">Diskon Nominal (Rp)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Target *</label>
              <select
                value={form.target}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    target: e.target.value as PromoTarget,
                    creditPackageId: "",
                    trackId: "",
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="ALL">Semua bundle dan credit</option>
                <option value="CREDIT">Top-up credit</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>

            {form.target === "CREDIT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Scope credit</label>
                <select
                  value={form.creditPackageId}
                  onChange={(e) => setForm((f) => ({ ...f, creditPackageId: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Semua paket credit</option>
                  {creditPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.label} · {pkg.credits.toLocaleString("id-ID")} credit · {fmtRp(pkg.priceIdr)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.target === "BUNDLE" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Scope bundle</label>
                <select
                  value={form.trackId}
                  onChange={(e) => setForm((f) => ({ ...f, trackId: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Semua bundle</option>
                  {bundles.map((bundle) => (
                    <option key={bundle.id} value={bundle.id}>
                      {bundle.title} · {bundle.isFree ? "Gratis" : fmtRp(bundle.priceIdr)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.type === "PERCENT_OFF" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Persen *</label>
                <Input
                  type="number" min={1} max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  placeholder="30"
                  required
                />
              </div>
            )}

            {form.type === "AMOUNT_OFF" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Nominal (Rp) *</label>
                <Input
                  type="number" min={1}
                  value={form.discountAmount}
                  onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
                  placeholder="50000"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Maks. pemakaian</label>
              <Input
                type="number" min={1}
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Tidak terbatas"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Min. transaksi (Rp)</label>
              <Input
                type="number" min={1}
                value={form.minAmountIdr}
                onChange={(e) => setForm((f) => ({ ...f, minAmountIdr: e.target.value }))}
                placeholder="Opsional"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Maks. diskon (Rp)</label>
              <Input
                type="number" min={1}
                value={form.maxDiscountIdr}
                onChange={(e) => setForm((f) => ({ ...f, maxDiscountIdr: e.target.value }))}
                placeholder={form.type === "PERCENT_OFF" ? "Opsional" : "Tidak perlu"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Kadaluarsa</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Deskripsi</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Promo untuk newsletter subscribers"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Membuat..." : "Buat Kode"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {promos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Belum ada kode promo</p>
          </div>
        ) : (
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kode</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diskon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pakai</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kadaluarsa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-900">{p.code}</span>
                    {p.description && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[p.type]}`}>
                      {TYPE_LABELS[p.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {TARGET_LABELS[p.target]}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {scopeLabel(p, creditPackages, bundles)}
                    {(p.minAmountIdr || p.maxDiscountIdr) && (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {p.minAmountIdr ? `Min ${fmtRp(p.minAmountIdr)}` : ""}
                        {p.minAmountIdr && p.maxDiscountIdr ? " · " : ""}
                        {p.maxDiscountIdr ? `Max diskon ${fmtRp(p.maxDiscountIdr)}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">
                    {discountLabel(p)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {p._count.redemptions}
                    {p.maxUses != null && <span className="text-gray-300"> / {p.maxUses}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(p.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p.id, p.isActive)}
                      title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {p.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deletePromo(p.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
