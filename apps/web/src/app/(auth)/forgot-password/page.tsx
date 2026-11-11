"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@kodevo/ui/button"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kodevo/ui/card"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <Card className="w-full max-w-[390px] border-[#F3F4F6] shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
          <div>
            <p className="font-semibold">Cek emailmu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Kalau emailmu terdaftar, kami sudah mengirim link reset password. Cek juga folder spam.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Kembali ke login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-[390px] border-[#F3F4F6] shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
      <CardHeader className="text-center">
        <CardTitle className="text-[24px] font-extrabold">Lupa password?</CardTitle>
        <CardDescription>Masukkan emailmu dan kami akan kirimkan link reset.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Link Reset
          </Button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke login
        </Link>
      </CardContent>
    </Card>
  )
}
