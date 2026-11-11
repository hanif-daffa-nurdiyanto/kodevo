"use client"

import { useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@kodevo/ui/avatar"
import { Button } from "@kodevo/ui/button"
import { Input } from "@kodevo/ui/input"
import { Label } from "@kodevo/ui/label"
import { Switch } from "@kodevo/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@kodevo/ui/dialog"
import { AtSign, Check, ExternalLink, KeyRound, Loader2, Lock, X } from "lucide-react"

interface Props {
  id: string
  name: string | null
  email: string | null
  image: string | null
  level: string
  xp: number
  streak: number
  passedTopics: number
  username: string | null
  isProfilePublic: boolean
  learningStyle: string | null
  guidancePreference: string | null
  githubUsername: string | null
  phone: string | null
  dateOfBirth: Date | null
  gender: string | null
  domisili: string | null
  pendidikan: string | null
  joinedAt: Date
  hasPassword: boolean
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-[13px] font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  )
}

const selectClass = "h-11 w-full rounded-lg border border-[#E5E7EB] bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"

export function ProfileSection(props: Props) {
  const initials = props.name
    ? props.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "KV"

  const [form, setForm] = useState({
    name: props.name ?? "",
    phone: props.phone ?? "",
    dateOfBirth: props.dateOfBirth ? new Date(props.dateOfBirth).toISOString().split("T")[0] : "",
    gender: props.gender ?? "",
    domisili: props.domisili ?? "",
    pendidikan: props.pendidikan ?? "",
    githubUsername: props.githubUsername ?? "",
    learningStyle: props.learningStyle ?? "",
    guidancePreference: props.guidancePreference ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)

  const [username, setUsername] = useState(props.username ?? "")
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [usernameSaved, setUsernameSaved] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPublic, setIsPublic] = useState(props.isProfilePublic)
  const [publicSaving, setPublicSaving] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState(false)

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function onUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    setUsername(clean)
    setUsernameError("")
    setUsernameSaved(false)
    if (clean === (props.username ?? "")) { setUsernameStatus("idle"); return }
    if (clean.length < 3) { setUsernameStatus(clean.length > 0 ? "invalid" : "idle"); return }
    setUsernameStatus("checking")
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/user/username?q=${encodeURIComponent(clean)}`)
      const data = await res.json()
      setUsernameStatus(data.available ? "available" : "taken")
    }, 500)
  }

  async function saveUsername() {
    setUsernameSaving(true)
    setUsernameError("")
    try {
      const res = await fetch("/api/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error); return }
      setUsernameStatus("idle")
      setUsernameSaved(true)
      setTimeout(() => setUsernameSaved(false), 3000)
    } finally {
      setUsernameSaving(false)
    }
  }

  async function togglePublic(val: boolean) {
    setIsPublic(val)
    setPublicSaving(true)
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isProfilePublic: val }),
      })
    } finally {
      setPublicSaving(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dateOfBirth: form.dateOfBirth || null,
          phone: form.phone || null,
          gender: form.gender || null,
          domisili: form.domisili || null,
          pendidikan: form.pendidikan || null,
          githubUsername: form.githubUsername || null,
          learningStyle: form.learningStyle || null,
          guidancePreference: form.guidancePreference || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function savePassword() {
    setPwLoading(true)
    setPwError("")
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error); return }
      setCurrentPassword("")
      setNewPassword("")
      setPwOpen(false)
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } finally {
      setPwLoading(false)
    }
  }

  const canSaveUsername =
    username !== (props.username ?? "") &&
    username.length >= 3 &&
    usernameStatus === "available" &&
    !usernameSaving

  return (
    <div className="flex max-w-[480px] flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-[72px] w-[72px] shrink-0 text-xl">
          <AvatarImage src={props.image ?? ""} alt={form.name} />
          <AvatarFallback className="kodevo-gradient text-[26px] font-extrabold text-white">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <Button type="button" variant="outline" className="mb-1.5 h-[38px] px-4 text-[13px]" disabled>
            Ganti Foto
          </Button>
          <p className="text-xs text-muted-foreground">JPG atau PNG, maks 2MB.</p>
        </div>
      </div>

      <Field label="Nama lengkap">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" placeholder="Nama lengkapmu" />
      </Field>

      <Field label="Username">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="username"
              className="h-11 pl-8 font-mono text-sm"
              maxLength={30}
            />
            {usernameStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
            {usernameStatus === "available" && <Check className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />}
            {usernameStatus === "taken" && <X className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-destructive" />}
          </div>
          <Button type="button" variant="outline" className="h-11" disabled={!canSaveUsername} onClick={saveUsername}>
            {usernameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan"}
          </Button>
        </div>
        {props.username && (
          <a href={`/profile/${props.username}`} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat profil publik
          </a>
        )}
        {usernameStatus === "taken" && <p className="mt-1 text-xs text-destructive">Username sudah dipakai.</p>}
        {usernameStatus === "invalid" && <p className="mt-1 text-xs text-destructive">Minimal 3 karakter.</p>}
        {usernameError && <p className="mt-1 text-xs text-destructive">{usernameError}</p>}
        {usernameSaved && <p className="mt-1 text-xs text-emerald-600">Username berhasil disimpan.</p>}
      </Field>

      <Field label="Email">
        <Input value={props.email ?? ""} disabled className="h-11" />
      </Field>

      <details className="rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold">Info tambahan</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="No. Telepon">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+62..." />
          </Field>
          <Field label="Tanggal Lahir">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </Field>
          <Field label="Jenis Kelamin">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={selectClass}>
              <option value="">Pilih...</option>
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
              <option value="OTHER">Lainnya</option>
              <option value="PREFER_NOT">Tidak ingin menyebutkan</option>
            </select>
          </Field>
          <Field label="Domisili">
            <Input value={form.domisili} onChange={(e) => set("domisili", e.target.value)} placeholder="Kota / Kabupaten" />
          </Field>
          <Field label="Pendidikan Terakhir">
            <select value={form.pendidikan} onChange={(e) => set("pendidikan", e.target.value)} className={selectClass}>
              <option value="">Pilih...</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA / SMK</option>
              <option value="D3">D3</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="BOOTCAMP">Bootcamp</option>
              <option value="SELF_TAUGHT">Self-taught</option>
            </select>
          </Field>
          <Field label="GitHub Username">
            <Input value={form.githubUsername} onChange={(e) => set("githubUsername", e.target.value)} placeholder="username" />
          </Field>
          <Field label="Gaya Belajar">
            <select value={form.learningStyle} onChange={(e) => set("learningStyle", e.target.value)} className={selectClass}>
              <option value="">Pilih...</option>
              <option value="READ_FIRST">Baca dulu, lalu praktik</option>
              <option value="CHUNK_QUIZ">Baca sambil langsung coba</option>
              <option value="CHALLENGE_FIRST">Tantangan dulu, baru penjelasan</option>
            </select>
          </Field>
          <Field label="Mode Belajar">
            <select value={form.guidancePreference} onChange={(e) => set("guidancePreference", e.target.value)} className={selectClass}>
              <option value="">Pilih...</option>
              <option value="GUIDED">Terbimbing penuh</option>
              <option value="SEMI_GUIDED">Semi mandiri</option>
              <option value="INDEPENDENT">Mandiri</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#F3F4F6] bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Profil publik</p>
            <p className="text-xs text-muted-foreground">Izinkan orang lain melihat profil dan aktivitas belajarmu</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={togglePublic} disabled={publicSaving} />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={saveProfile} disabled={saving} className="h-11 px-6">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Perubahan
        </Button>
        {props.hasPassword && (
          <Dialog open={pwOpen} onOpenChange={(o) => {
            setPwOpen(o)
            if (!o) { setPwError(""); setCurrentPassword(""); setNewPassword("") }
          }}>
            <DialogTrigger render={<Button type="button" variant="outline" className="h-11 gap-2" />}>
              <KeyRound className="h-3.5 w-3.5" />
              Ganti Password
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogTitle>Ganti Password</DialogTitle>
              <DialogDescription>Masukkan password lama dan password baru.</DialogDescription>
              <div className="space-y-3 pt-2">
                {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                <Field label="Password Lama">
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label="Password Baru">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    onKeyDown={(e) => { if (e.key === "Enter") savePassword() }}
                  />
                </Field>
                <Button className="w-full" onClick={savePassword} disabled={pwLoading || !currentPassword || !newPassword}>
                  {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Lock className="mr-2 h-4 w-4" />
                  Simpan Password
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {saved && <p className="text-sm text-emerald-600">Tersimpan.</p>}
        {pwSuccess && <p className="text-sm text-emerald-600">Password diperbarui.</p>}
      </div>
    </div>
  )
}
