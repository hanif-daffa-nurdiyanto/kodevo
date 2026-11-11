"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export function DeleteMaterialButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm("Hapus cache materi ini? User akan generate ulang saat buka topik.")) return
    setLoading(true)
    await fetch(`/api/studio/materials/${id}`, { method: "DELETE" })
    router.push("/materials")
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {loading ? "Menghapus..." : "Hapus Cache"}
    </button>
  )
}
