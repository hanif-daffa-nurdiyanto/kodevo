"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { CheckCircle, GripVertical, Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react"

type BundleFormItem = {
  id: string
  title: string
  slug: string
  description: string
  icon: string | null
  order: number | null
  priceIdr: number | null
  hasCertificate: boolean
  isFree: boolean
  publishedAt: string | Date | null
  purchases: number
}

type BundleTopicItem = {
  id: string
  title: string
  description: string
  learningObjective: string
  order: number
}

type BundleModuleItem = {
  id: string
  title: string
  description: string
  order: number
  isFree: boolean
  topics: BundleTopicItem[]
}

type BundleFormState = {
  title: string
  slug: string
  description: string
  icon: string
  order: string
  priceIdr: string
  hasCertificate: boolean
  isFree: boolean
}

function toNullableInt(value: string): number | null {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function bundlePayload(form: BundleFormState) {
  return {
    title: form.title,
    description: form.description,
    icon: form.icon || null,
    priceIdr: form.isFree ? null : toNullableInt(form.priceIdr),
    hasCertificate: form.hasCertificate,
    isFree: form.isFree,
  }
}

function bundleCreatePayload(form: BundleFormState) {
  return {
    title: form.title,
    description: form.description,
    icon: form.icon || null,
    priceIdr: form.isFree ? null : toNullableInt(form.priceIdr),
    hasCertificate: form.hasCertificate,
    isFree: form.isFree,
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error
  }
  return fallback
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order)
}

function moveById<T extends { id: string }>(items: T[], activeId: string, overId: string): T[] {
  const activeIndex = items.findIndex((item) => item.id === activeId)
  const overIndex = items.findIndex((item) => item.id === overId)
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return items

  const nextItems = [...items]
  const [activeItem] = nextItems.splice(activeIndex, 1)
  nextItems.splice(overIndex, 0, activeItem)
  return nextItems
}

export function BundleCreateForm() {
  const [form, setForm] = useState<BundleFormState>({
    title: "",
    slug: "",
    description: "",
    icon: "📚",
    order: "",
    priceIdr: "",
    hasCertificate: false,
    isFree: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundleCreatePayload(form)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal membuat bundle"))
      window.location.href = `/bundles/${data.bundle.id}/edit`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat bundle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[0.35fr_1fr]">
        <Field label="Icon">
          <input
            value={form.icon}
            onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
            placeholder="📚"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          />
        </Field>
        <Field label="Title">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Bundle title"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </Field>
      </div>
      <div className="mb-0!">
        {!form.isFree && (
          <Field label="Price IDR">
            <input
              type="number"
              min={0}
              value={form.priceIdr}
              onChange={(event) => setForm((current) => ({ ...current, priceIdr: event.target.value }))}
              placeholder="199000"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            />
          </Field>
        )}

      </div>
      <label className="flex h-10 items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={form.isFree}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              isFree: event.target.checked,
              priceIdr: event.target.checked ? "" : current.priceIdr,
            }))
          }
          className="h-4 w-4 rounded border-gray-300"
        />
        Free bundle
      </label>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Description"
          className="min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          required
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={form.hasCertificate}
            onChange={(event) => setForm((current) => ({ ...current, hasCertificate: event.target.checked }))}
            className="h-4 w-4 rounded border-gray-300"
          />
          Certificate
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create Bundle
      </button>
    </form>
  )
}

export function BundleMetadataForm({ bundle }: { bundle: BundleFormItem }) {
  const [form, setForm] = useState<BundleFormState>({
    title: bundle.title,
    slug: bundle.slug,
    description: bundle.description,
    icon: bundle.icon ?? "",
    order: bundle.order === null ? "" : String(bundle.order),
    priceIdr: bundle.priceIdr === null ? "" : String(bundle.priceIdr),
    hasCertificate: bundle.hasCertificate,
    isFree: bundle.isFree,
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundlePayload(form)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan bundle"))
      setSaved(true)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bundle")
    } finally {
      setLoading(false)
    }
  }

  async function deleteBundle() {
    if (!window.confirm(`Hapus bundle "${bundle.title}"? Modul dan topik di dalamnya ikut terhapus.`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundle.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menghapus bundle"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus bundle")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[0.35fr_1fr]">
        <Field label="Icon">
          <input
            value={form.icon}
            onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
            placeholder="📚"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          />
        </Field>
        <Field label="Title">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Title"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </Field>
      </div>
      {/* <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Slug dikelola sistem: <span className="font-mono font-semibold text-gray-700">{bundle.slug}</span>
      </div> */}
      <div className="mb-0!">
        {!form.isFree && (
          <Field label="Price IDR">
            <input
              type="number"
              min={0}
              value={form.priceIdr}
              onChange={(event) => setForm((current) => ({ ...current, priceIdr: event.target.value }))}
              placeholder="199000"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
            />
          </Field>
        )}

      </div>
      <label className="inline-flex h-10 items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={form.isFree}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              isFree: event.target.checked,
              priceIdr: event.target.checked ? "" : current.priceIdr,
            }))
          }
          className="h-4 w-4 rounded border-gray-300"
        />
        Free bundle
      </label>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          required
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={form.hasCertificate}
            onChange={(event) => setForm((current) => ({ ...current, hasCertificate: event.target.checked }))}
            className="h-4 w-4 rounded border-gray-300"
          />
          Certificate enabled
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save Bundle"}
        </button>
        <button
          type="button"
          onClick={deleteBundle}
          disabled={deleting || bundle.purchases > 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-4 text-sm font-semibold text-red-600 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
          title={bundle.purchases > 0 ? "Bundle yang sudah dibeli tidak bisa dihapus" : "Delete bundle"}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Bundle
        </button>
      </div>
    </form>
  )
}

export function BundleGenerateDraftForm({ bundleId, defaultBrief }: { bundleId: string; defaultBrief: string }) {
  const [brief, setBrief] = useState(defaultBrief)
  const [replaceExisting, setReplaceExisting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, replaceExisting }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal generate draft bundle"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate draft bundle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Generation brief">
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          required
        />
      </Field>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(event) => setReplaceExisting(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Replace existing modules and topics
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Draft Content
      </button>
    </form>
  )
}

export function BundlePublicationButton({
  bundleId,
  publishedAt,
  disabled,
  disabledReason,
}: {
  bundleId: string
  publishedAt: string | Date | null
  disabled?: boolean
  disabledReason?: string
}) {
  const isPublished = Boolean(publishedAt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updatePublication() {
    const nextPublished = !isPublished
    if (!window.confirm(nextPublished ? "Publish bundle ini ke user app?" : "Kembalikan bundle ini ke draft?")) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, nextPublished ? "Gagal publish bundle" : "Gagal unpublish bundle"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : nextPublished ? "Gagal publish bundle" : "Gagal unpublish bundle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={updatePublication}
        disabled={loading || disabled}
        className={isPublished
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 text-sm font-semibold text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPublished ? <X className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        {isPublished ? "Unpublish" : "Publish"}
      </button>
      {disabled && disabledReason && !isPublished && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{disabledReason}</p>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function BundleContentEditor({
  bundleId,
  bundleIsFree,
  modules,
}: {
  bundleId: string
  bundleIsFree: boolean
  modules: BundleModuleItem[]
}) {
  const [creating, setCreating] = useState(false)
  const [editingModule, setEditingModule] = useState<BundleModuleItem | null>(null)
  const [orderedModules, setOrderedModules] = useState(() => sortByOrder(modules))
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    setOrderedModules(sortByOrder(modules))
  }, [modules])

  async function saveModuleOrder(nextModules: BundleModuleItem[]) {
    setSavingOrder(true)
    setOrderError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: nextModules.map((mod) => mod.id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan urutan module"))
    } catch (err) {
      setOrderedModules(sortByOrder(modules))
      setOrderError(err instanceof Error ? err.message : "Gagal menyimpan urutan module")
    } finally {
      setSavingOrder(false)
    }
  }

  function dropModule(overId: string) {
    if (!draggingModuleId) return
    const nextModules = moveById(orderedModules, draggingModuleId, overId).map((mod, index) => ({
      ...mod,
      order: index + 1,
    }))
    setDraggingModuleId(null)
    if (nextModules === orderedModules) return
    setOrderedModules(nextModules)
    void saveModuleOrder(nextModules)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-5">
          {savingOrder && <p className="text-xs font-medium text-blue-600">Menyimpan urutan module...</p>}
          {orderError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{orderError}</p>}
        </div>
        {/* {!bundleIsFree && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            Bundle berbayar otomatis tidak memotong credit setelah user membeli bundle.
          </p>
        )} */}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      </div>
      {modules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-8 text-center">
          <p className="text-sm font-semibold text-amber-800">Bundle masih draft karena belum ada module.</p>
          <p className="mt-1 text-xs text-amber-700">Generate draft atau tambah module manual sebelum publish.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[760px] divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="w-12 px-4 py-3" aria-label="Reorder" />
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Topics</th>
                {bundleIsFree && <th className="px-4 py-3">Access</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orderedModules.map((mod) => (
                <tr
                  key={mod.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropModule(mod.id)}
                  className={draggingModuleId === mod.id ? "bg-blue-50/60" : ""}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDraggingModuleId(mod.id)}
                      onDragEnd={() => setDraggingModuleId(null)}
                      className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 active:cursor-grabbing"
                      title="Geser urutan module"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{mod.order}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{mod.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{mod.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{mod.topics.length} topics</td>
                  {bundleIsFree && (
                    <td className="px-4 py-3">
                      <ModuleAccessBadge isFree={mod.isFree} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingModule(mod)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <ModuleDeleteButton bundleId={bundleId} module={mod} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <Modal title="Add Module" onClose={() => setCreating(false)}>
          <ModuleCreateForm bundleId={bundleId} bundleIsFree={bundleIsFree} />
        </Modal>
      )}
      {editingModule && (
        <Modal title="Edit Module" onClose={() => setEditingModule(null)}>
          <ModuleEditor bundleId={bundleId} bundleIsFree={bundleIsFree} module={editingModule} />
        </Modal>
      )}
    </div>
  )
}

function ModuleCreateForm({
  bundleId,
  bundleIsFree,
}: {
  bundleId: string
  bundleIsFree: boolean
}) {
  const [form, setForm] = useState({ title: "", description: "", isFree: bundleIsFree })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          isFree: form.isFree,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menambah module"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah module")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title">
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="New module title"
          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Module description"
          className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          required
        />
      </Field>
      {bundleIsFree ? (
        <ModuleAccessControl
          isFree={form.isFree}
          onChange={(isFree) => setForm((current) => ({ ...current, isFree }))}
        />
      ) : (
        <BundlePaidModuleNotice />
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add Module
      </button>
    </form>
  )
}

function ModuleEditor({
  bundleId,
  bundleIsFree,
  module,
}: {
  bundleId: string
  bundleIsFree: boolean
  module: BundleModuleItem
}) {
  const [form, setForm] = useState({
    title: module.title,
    description: module.description,
    isFree: module.isFree,
  })
  const [topics, setTopics] = useState(() => sortByOrder(module.topics))
  const [draggingTopicId, setDraggingTopicId] = useState<string | null>(null)
  const [savingTopicOrder, setSavingTopicOrder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTopics(sortByOrder(module.topics))
  }, [module.topics])

  async function saveTopicOrder(nextTopics: BundleTopicItem[]) {
    setSavingTopicOrder(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${module.id}/topics/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: nextTopics.map((topic) => topic.id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan urutan topic"))
    } catch (err) {
      setTopics(sortByOrder(module.topics))
      setError(err instanceof Error ? err.message : "Gagal menyimpan urutan topic")
    } finally {
      setSavingTopicOrder(false)
    }
  }

  function dropTopic(overId: string) {
    if (!draggingTopicId) return
    const nextTopics = moveById(topics, draggingTopicId, overId).map((topic, index) => ({
      ...topic,
      order: index + 1,
    }))
    setDraggingTopicId(null)
    if (nextTopics === topics) return
    setTopics(nextTopics)
    void saveTopicOrder(nextTopics)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${module.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          isFree: form.isFree,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan module"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan module")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-4">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-blue-400"
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            required
          />
        </Field>
        {bundleIsFree ? (
          <ModuleAccessControl
            isFree={form.isFree}
            onChange={(isFree) => setForm((current) => ({ ...current, isFree }))}
          />
        ) : (
          <BundlePaidModuleNotice />
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Module
        </button>
      </form>
      <div className="space-y-3 border-t border-gray-100 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Topics</h3>
          <p className="mt-1 text-xs text-gray-500">
            Tambah, edit, dan geser topic di dalam module ini.
            {savingTopicOrder && <span className="ml-2 font-medium text-blue-600">Menyimpan urutan...</span>}
          </p>
        </div>
        <TopicCreateForm bundleId={bundleId} moduleId={module.id} />
        {topics.map((topic) => (
          <div
            key={topic.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropTopic(topic.id)}
            className={draggingTopicId === topic.id ? "rounded-lg bg-blue-50/60" : ""}
          >
            <TopicEditor
              bundleId={bundleId}
              moduleId={module.id}
              topic={topic}
              onDragStart={() => setDraggingTopicId(topic.id)}
              onDragEnd={() => setDraggingTopicId(null)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function TopicCreateForm({ bundleId, moduleId }: { bundleId: string; moduleId: string }) {
  const [form, setForm] = useState({ title: "", description: "", learningObjective: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${moduleId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          learningObjective: form.learningObjective,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menambah topic"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah topic")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
      <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Topic title" className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-blue-400" required />
      <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-blue-400" required />
      <input value={form.learningObjective} onChange={(event) => setForm((current) => ({ ...current, learningObjective: event.target.value }))} placeholder="Learning objective" className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-blue-400" required />
      <button type="submit" disabled={loading} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 ring-1 ring-blue-100 hover:bg-blue-100 disabled:opacity-50">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Topic
      </button>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 md:col-span-4">{error}</p>}
    </form>
  )
}

function TopicEditor({
  bundleId,
  moduleId,
  topic,
  onDragStart,
  onDragEnd,
}: {
  bundleId: string
  moduleId: string
  topic: BundleTopicItem
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const [form, setForm] = useState({
    title: topic.title,
    description: topic.description,
    learningObjective: topic.learningObjective,
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${moduleId}/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          learningObjective: form.learningObjective,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menyimpan topic"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan topic")
    } finally {
      setLoading(false)
    }
  }

  async function deleteTopic() {
    if (!window.confirm(`Hapus topic "${topic.title}"?`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${moduleId}/topics/${topic.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menghapus topic"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus topic")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-lg border border-gray-100 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[auto_1fr_1fr_1.2fr_auto_auto]">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 active:cursor-grabbing"
          title="Geser urutan topic"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-semibold outline-none focus:border-blue-400" required />
        <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-blue-400" required />
        <input value={form.learningObjective} onChange={(event) => setForm((current) => ({ ...current, learningObjective: event.target.value }))} className="h-9 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-blue-400" required />
        <button type="submit" disabled={loading} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
        <button type="button" onClick={deleteTopic} disabled={deleting} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-600 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-50">
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </form>
  )
}

function ModuleAccessBadge({ isFree }: { isFree: boolean }) {
  return (
    <span
      className={
        isFree
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
          : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
      }
    >
      {isFree ? "Free" : "Paid"}
    </span>
  )
}

function BundlePaidModuleNotice() {
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
      Akses module mengikuti pembelian bundle. Setelah user membeli bundle, generate materi tidak memotong credit.
    </div>
  )
}

function ModuleAccessControl({
  isFree,
  onChange,
}: {
  isFree: boolean
  onChange: (isFree: boolean) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-500">Module access</p>
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            isFree
              ? "h-8 rounded-md bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm"
              : "h-8 rounded-md px-3 text-xs font-semibold text-gray-500 hover:text-gray-800"
          }
        >
          Free
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            !isFree
              ? "h-8 rounded-md bg-white px-3 text-xs font-semibold text-amber-700 shadow-sm"
              : "h-8 rounded-md px-3 text-xs font-semibold text-gray-500 hover:text-gray-800"
          }
        >
          Paid
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {isFree ? "User bisa membuka module ini tanpa membeli bundle." : "User harus membeli bundle untuk membuka module ini."}
      </p>
    </div>
  )
}

function ModuleDeleteButton({ bundleId, module }: { bundleId: string; module: BundleModuleItem }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteModule() {
    if (!window.confirm(`Hapus module "${module.title}" beserta semua topiknya?`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}/modules/${module.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(errorMessage(data, "Gagal menghapus module"))
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus module")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={deleteModule}
        disabled={deleting}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-600 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-50"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete
      </button>
      {error && (
        <span className="absolute right-0 top-10 z-10 w-48 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 shadow-sm ring-1 ring-red-100">
          {error}
        </span>
      )}
    </span>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}
