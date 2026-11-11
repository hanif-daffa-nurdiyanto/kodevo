"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { GitBranch, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react"
import { Button, buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kodevo/ui/card"
import Link from "next/link"
import { cn } from "@kodevo/utils"

type GitHubUser = {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  public_repos: number
}

type Status = "loading" | "connected" | "disconnected" | "error"

export default function GitHubSettingsPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>("loading")
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [banner, setBanner] = useState<"connected" | "error" | null>(() => {
    if (searchParams.get("github_connected") === "1") return "connected"
    if (searchParams.get("github_error")) return "error"
    return null
  })

  useEffect(() => {
    fetch("/api/github/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setGhUser(data.user)
          setStatus("connected")
        } else {
          setStatus("disconnected")
        }
      })
      .catch(() => setStatus("error"))
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    const res = await fetch("/api/github/disconnect", { method: "POST" })
    if (res.ok) {
      setGhUser(null)
      setStatus("disconnected")
      setBanner(null)
    }
    setDisconnecting(false)
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-6 px-4 py-10 md:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings?tab=github"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">Koneksi GitHub</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hubungkan akun GitHub untuk menggunakan AI Code Review
          </p>
        </div>
      </div>

      {banner === "connected" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          GitHub berhasil terhubung.
        </div>
      )}
      {banner === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <XCircle className="h-4 w-4 shrink-0" />
          Koneksi GitHub gagal. Coba lagi.
        </div>
      )}

      <Card className="border-[#F3F4F6] shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#1A1A2E] text-white">
              <GitBranch className="h-5 w-5" />
            </span>
            GitHub
          </CardTitle>
          <CardDescription>
            Diperlukan untuk fitur AI Code Review (Pro). Akses read-only ke repo kamu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          )}

          {status === "connected" && ghUser && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ghUser.avatar_url}
                  alt={ghUser.login}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    {ghUser.name ?? ghUser.login}
                    <a
                      href={ghUser.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{ghUser.login} · {ghUser.public_repos} public repos
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? "Memutus..." : "Putus koneksi"}
              </Button>
            </div>
          )}

          {status === "disconnected" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Akun GitHub belum terhubung.
              </div>
              <a
                href="/api/github/connect?returnTo=/settings/github"
                className={buttonVariants({ size: "sm" })}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Hubungkan GitHub
              </a>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-muted-foreground">
              Gagal memuat status. Coba refresh halaman.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#F3F4F6] shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Izin yang diminta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <span><strong className="text-foreground">repo</strong> — membaca file kode dari repositori kamu untuk AI Code Review</span>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span>Tidak ada akses write, tidak ada akses ke data pribadi lain</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
