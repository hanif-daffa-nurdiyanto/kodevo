"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@kodevo/ui/button"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kodevo/ui/card"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Loader2 } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword]   = useState("")
  const [confirm, setConfirm]     = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }
    if (password !== confirm) {
      setError("Password tidak cocok.")
      return
    }
    if (!token) {
      setError("Link tidak valid.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Gagal mereset password.")
      return
    }

    router.push("/login?reset=1")
  }

  if (!token) {
    return (
      <Card className="w-full max-w-[390px] border-[#F3F4F6] shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Link tidak valid.</p>
          <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
            Minta link baru
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-[390px] border-[#F3F4F6] shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
      <CardHeader className="text-center">
        <CardTitle className="text-[24px] font-extrabold">Buat password baru</CardTitle>
        <CardDescription>Pastikan passwordmu minimal 8 karakter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password baru</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Konfirmasi password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Ulangi password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Password Baru
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
