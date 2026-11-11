"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SetupPage() {
  const router = useRouter()
  const [secret, setSecret] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    const res = await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    })

    const data = await res.json()

    if (res.ok) {
      setStatus("done")
      setMessage(data.message)
      setTimeout(() => router.push("/"), 1500)
    } else {
      setStatus("error")
      setMessage(data.error ?? "Terjadi kesalahan")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo-full.png" alt="Kodevo" width={120} height={36} className="h-9 w-auto" />
          <div className="text-center">
            <h1 className="text-xl font-bold">Setup Admin Pertama</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Halaman ini hanya aktif selama belum ada admin.
            </p>
          </div>
        </div>

        {status === "done" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
            {message} — mengalihkan ke Studio...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Bootstrap Secret
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Masukkan ADMIN_BOOTSTRAP_SECRET"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nilai dari env var <code className="rounded bg-muted px-1">ADMIN_BOOTSTRAP_SECRET</code> di Coolify.
              </p>
            </div>

            {status === "error" && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !secret}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {status === "loading" ? "Memproses..." : "Jadikan Admin"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
