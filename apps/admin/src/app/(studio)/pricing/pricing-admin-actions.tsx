"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react"

type CreditPackageItem = {
  id: string
  label: string
  description: string | null
  credits: number
  priceIdr: number
  isActive: boolean
  order: number | null
}

type CreditPackageFormState = {
  label: string
  description: string
  credits: string
  priceIdr: string
  isActive: boolean
  order: string
}

type ActionCostKey =
  | "credit_cost_curriculum"
  | "credit_cost_material"
  | "credit_cost_quiz"
  | "credit_cost_exercise_generate"
  | "credit_cost_exercise_submit"
  | "credit_cost_project"
  | "credit_cost_chat"

type ActionCostItem = {
  key: ActionCostKey
  label: string
  value: number
}

const actionCostLabels: Record<ActionCostKey, string> = {
  credit_cost_curriculum: "Generate curriculum",
  credit_cost_material: "Generate material",
  credit_cost_quiz: "Generate quiz",
  credit_cost_exercise_generate: "Generate exercise",
  credit_cost_exercise_submit: "Submit exercise",
  credit_cost_project: "Submit project",
  credit_cost_chat: "Chat tutor",
}

function packageFormState(pkg?: CreditPackageItem): CreditPackageFormState {
  return {
    label: pkg?.label ?? "",
    description: pkg?.description ?? "",
    credits: pkg ? String(pkg.credits) : "",
    priceIdr: pkg ? String(pkg.priceIdr) : "",
    isActive: pkg?.isActive ?? true,
    order: pkg?.order === null || pkg?.order === undefined ? "" : String(pkg.order),
  }
}

function toInt(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : NaN
}

function toNullableInt(value: string): number | null {
  if (value.trim() === "") return null
  return toInt(value)
}

function packagePayload(form: CreditPackageFormState) {
  return {
    label: form.label.trim(),
    description: form.description.trim() || null,
    credits: toInt(form.credits),
    priceIdr: toInt(form.priceIdr),
    isActive: form.isActive,
    order: toNullableInt(form.order),
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error
  }
  return fallback
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass = "h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"

function fmtRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function PricingModal({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function CreditPackageCreateButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        Tambah Paket
      </button>
      {open && (
        <PricingModal
          title="Tambah Paket Credit"
          description="Paket aktif akan tampil di landing pricing dan halaman /credits."
          onClose={() => setOpen(false)}
        >
          <CreditPackageForm mode="create" onCancel={() => setOpen(false)} />
        </PricingModal>
      )}
    </>
  )
}

function CreditPackageForm({
  pkg,
  mode,
  onCancel,
}: {
  pkg?: CreditPackageItem
  mode: "create" | "edit"
  onCancel: () => void
}) {
  const [form, setForm] = useState<CreditPackageFormState>(packageFormState(pkg))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/pricing/credit-packages" : `/api/admin/pricing/credit-packages/${pkg?.id}`,
        {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packagePayload(form)),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, mode === "create" ? "Gagal membuat paket credit" : "Gagal menyimpan paket credit"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan paket credit")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nama Paket">
          <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} className={inputClass} required />
        </Field>
        <Field label="Urutan">
          <input type="number" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))} className={inputClass} placeholder="Optional" />
        </Field>
      </div>
      <Field label="Deskripsi">
        <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" maxLength={240} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Credits">
          <input type="number" min={1} value={form.credits} onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))} className={inputClass} required />
        </Field>
        <Field label="Harga IDR">
          <input type="number" min={0} value={form.priceIdr} onChange={(event) => setForm((current) => ({ ...current, priceIdr: event.target.value }))} className={inputClass} required />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
        Aktif di user dan landing
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onCancel} disabled={loading} className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
          Batal
        </button>
        <button type="submit" disabled={loading} className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Tambah Paket" : "Simpan Paket"}
        </button>
      </div>
    </form>
  )
}

export function CreditPackageRows({ packages }: { packages: CreditPackageItem[] }) {
  return (
    <tbody className="divide-y divide-gray-100">
      {packages.length === 0 && (
        <tr>
          <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Belum ada paket credit.</td>
        </tr>
      )}
      {packages.map((pkg) => (
        <CreditPackageRow key={pkg.id} pkg={pkg} />
      ))}
    </tbody>
  )
}

function CreditPackageRow({ pkg }: { pkg: CreditPackageItem }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!window.confirm(`Hapus paket "${pkg.label}"?`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pricing/credit-packages/${pkg.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menghapus paket"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus paket")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50/50">
        <td className="px-5 py-3">
          <p className="font-medium text-gray-900">{pkg.label}</p>
          <p className="mt-0.5 max-w-[340px] truncate text-xs text-gray-400">{pkg.description ?? "Tanpa deskripsi"}</p>
          {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        </td>
        <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">{pkg.credits.toLocaleString("id-ID")}</td>
        <td className="px-4 py-3 font-semibold tabular-nums text-gray-900">{fmtRp(pkg.priceIdr)}</td>
        <td className="px-4 py-3 tabular-nums text-gray-500">{pkg.order ?? "—"}</td>
        <td className="px-4 py-3 text-center">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            {pkg.isActive ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(true)} disabled={deleting} className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button type="button" onClick={remove} disabled={deleting} className="flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <PricingModal
          title={`Edit ${pkg.label}`}
          description="Ubah metadata, harga, credit, urutan, atau status aktif paket."
          onClose={() => setEditing(false)}
        >
          <CreditPackageForm pkg={pkg} mode="edit" onCancel={() => setEditing(false)} />
        </PricingModal>
      )}
    </>
  )
}

export function ActionCostForm({ costs }: { costs: ActionCostItem[] }) {
  const [values, setValues] = useState<Record<ActionCostKey, string>>(
    Object.fromEntries(costs.map((cost) => [cost.key, String(cost.value)])) as Record<ActionCostKey, string>
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = Object.fromEntries(
        costs.map((cost) => [cost.key, toInt(values[cost.key] ?? "0")])
      )
      const res = await fetch("/api/admin/pricing/action-costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan cost per action"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan cost per action")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {costs.map((cost) => (
          <Field key={cost.key} label={actionCostLabels[cost.key]}>
            <input
              type="number"
              min={0}
              value={values[cost.key] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [cost.key]: event.target.value }))}
              className={inputClass}
              required
            />
          </Field>
        ))}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan Cost
      </button>
    </form>
  )
}
