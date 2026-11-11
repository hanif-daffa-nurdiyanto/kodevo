"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Alert, AlertDescription } from "@kodevo/ui/alert"
import { Button } from "@kodevo/ui/button"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Separator } from "@kodevo/ui/separator"
import { ArrowRight, BookOpen, Loader2, LogIn, PenLine } from "lucide-react"
import { cn } from "@kodevo/utils"

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

type RegisterStep = 1 | 2

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<RegisterStep>(1)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const initial = name.trim() ? name.trim()[0].toUpperCase() : "?"
  const suggestedUsername = useMemo(() => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 28)
  }, [name])
  const usernameValue = username || suggestedUsername
  const usernameValid = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$|^[a-z0-9]{3,30}$/.test(usernameValue)
  const formReady = name.trim().length >= 2 && usernameValid && email.trim().length > 0 && password.length >= 8
  const firstName = name.trim().split(" ")[0] || "kamu"

  function sanitizeUsername(value: string) {
    return value.replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 30)
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }

    if (!usernameValid) {
      setError("Username minimal 3 karakter dan hanya boleh huruf kecil, angka, underscore, atau dash.")
      return
    }

    setLoading(true)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username: usernameValue, email, password }),
    })

    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({}))
      const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "Gagal membuat akun."
      setError(message)
      setLoading(false)
      return
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (signInResult?.error) {
      setError("Akun berhasil dibuat, tapi login otomatis gagal. Silakan masuk manual.")
      return
    }

    setStep(2)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn("google", { callbackUrl: "/learn?filter=bundle" })
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col overflow-y-auto bg-white text-[#1A1A2E]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-12">
        <Link href="/" className="flex items-center gap-2 text-inherit">
          <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto" priority />
        </Link>

        <div className="flex items-center gap-2.5" aria-hidden="true">
          <span className={cn("h-1.5 rounded-full transition-all", step === 1 ? "w-8" : "w-5", "kodevo-gradient")} />
          <span className={cn("h-1.5 rounded-full transition-all", step === 2 ? "w-8 kodevo-gradient" : "w-5 bg-[#F3F4F6]")} />
        </div>

        <Link href="/login" className="inline-flex min-w-[64px] items-center justify-end gap-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#3D8EF0]">
          <LogIn className="h-3.5 w-3.5" />
          Masuk
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-8">
        {step === 1 && (
        <section className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-9 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-normal">Lengkapi profilmu</h1>
            <p className="mt-2 text-[15px] text-[#6B7280]">Biar kamu bisa langsung memilih jalur belajar yang cocok.</p>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="relative cursor-default">
              <div className={cn(
                "flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-[#F3F4F6] font-heading text-[28px] font-extrabold text-white",
                name.trim() ? "kodevo-gradient" : "bg-[#D1D5DB]"
              )}>
                {initial}
              </div>
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-[#F3F4F6] bg-white text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                ✎
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            className="h-11 w-full border-[#E5E7EB] text-[#1A1A2E]"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
            Daftar dengan Google
          </Button>

          <div className="relative my-5">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-[#6B7280]">
              atau
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-semibold text-[#1A1A2E]">Nama lengkap</Label>
              <Input
                id="name"
                placeholder="cth. Alya Ramadhani"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={loading}
                className="h-11 border-[#E5E7EB] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[13px] font-semibold text-[#1A1A2E]">Username</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">@</span>
                <Input
                  id="username"
                  placeholder={suggestedUsername || "username"}
                  value={username}
                  onChange={(event) => setUsername(sanitizeUsername(event.target.value))}
                  disabled={loading}
                  className={cn("h-11 border-[#E5E7EB] pl-8 text-sm", usernameValue && !usernameValid && "border-[#EF4444]")}
                />
              </div>
              <p className={cn("text-xs", usernameValue && usernameValid ? "text-[#00A88A]" : "text-[#6B7280]")}>
                {usernameValue && usernameValid ? `kodevo.id/@${usernameValue} tersedia jika belum dipakai` : "Minimal 3 karakter, tanpa spasi."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-[#1A1A2E]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                className="h-11 border-[#E5E7EB] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-semibold text-[#1A1A2E]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                className="h-11 border-[#E5E7EB] text-sm"
              />
            </div>

            <Button type="submit" className="h-12 w-full rounded-lg text-[15px]" disabled={loading || googleLoading || !formReady}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Lanjut
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-[#6B7280]">
            Dengan mendaftar, kamu setuju dengan{" "}
            <Link href="/syarat" className="font-medium text-[#3D8EF0] hover:text-[#00C9A7]">
              Syarat & Ketentuan
            </Link>
          </p>
        </section>
        )}

        {step === 2 && (
          <section className="w-full max-w-[760px] animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-10 text-center">
              <h1 className="text-[32px] font-extrabold leading-tight tracking-normal">Halo, {firstName}! Mau mulai dari mana?</h1>
              <p className="mt-2 text-[15px] text-[#6B7280]">Pilih track siap pakai, atau buat roadmap personal dari tujuanmu sendiri.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <OnboardingChoiceCard
                icon={BookOpen}
                iconBg="bg-[#F0FDF4]"
                title="Mulai dari Track"
                desc="Lihat pack dan bundle yang sudah tersedia seperti Frontend, Data Analyst, AI Engineer, dan lainnya."
                cta="Lihat Track"
                onClick={() => router.push("/learn?filter=bundle")}
              />
              <OnboardingChoiceCard
                icon={PenLine}
                iconBg="bg-[#EFF6FF]"
                title="Buat Roadmap Sendiri"
                desc="Tulis tujuan belajarmu secara bebas, lalu Kodevo bantu siapkan roadmap personal."
                cta="Buat Roadmap"
                onClick={() => router.push("/learn/new")}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function OnboardingChoiceCard({
  icon: Icon,
  iconBg,
  title,
  desc,
  cta,
  onClick,
}: {
  icon: typeof BookOpen
  iconBg: string
  title: string
  desc: string
  cta: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-[#F3F4F6] bg-white px-7 py-8 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#00C9A7] hover:shadow-[0_10px_26px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-[#3D8EF0]/15"
    >
      <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-[#3D8EF0]", iconBg)}>
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 min-h-[68px] text-sm leading-[1.6] text-[#6B7280]">{desc}</p>
      <div className="mt-5 inline-flex items-center text-sm font-bold text-[#3D8EF0] transition-colors group-hover:text-[#00A88A]">
        {cta}
        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}
