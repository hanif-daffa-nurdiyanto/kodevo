"use client"

import { Suspense, useMemo, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Button } from "@kodevo/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kodevo/ui/card"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Separator } from "@kodevo/ui/separator"

function AdminLoginForm() {
  const params = useSearchParams()
  const callbackUrl = useMemo(() => params.get("callbackUrl") ?? "/", [params])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    setLoading(false)

    if (res?.error) {
      setError("Email atau password salah.")
      return
    }

    window.location.href = res?.url ?? callbackUrl
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/logo-full.png" alt="Kodevo" width={140} height={33} className="mb-2 h-8 w-auto" priority />
          <CardTitle>Admin Studio</CardTitle>
          <CardDescription>Login dengan akun admin Kodevo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Login"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">atau</span>
            <Separator className="flex-1" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Login dengan Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  )
}
