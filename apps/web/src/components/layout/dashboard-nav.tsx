"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@kodevo/ui/avatar"
import { Badge } from "@kodevo/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kodevo/ui/dropdown-menu"
import { BookOpen, Coins, Compass, Hammer, LayoutDashboard, LogOut, Menu, Rocket, Settings, UserCircle, Users, type LucideIcon } from "lucide-react"
import { cn } from "@kodevo/utils"
import { useEffect, useState } from "react"

interface Props {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    level: string
    isPremium: boolean
    isPro: boolean
    xp: number
    streak: number
    username?: string | null
  }
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, iconBg: "bg-[#EFF6FF] text-[#3D8EF0]" },
  { href: "/learn", label: "Belajar", icon: BookOpen, iconBg: "bg-[#F0FDF4] text-[#00A88A]" },
  { href: "/credits", label: "Credits", icon: Coins, iconBg: "bg-[#EFF6FF] text-[#3D8EF0]" },
  { href: "/community", label: "Community", icon: Users, iconBg: "bg-[#EFF6FF] text-[#3D8EF0]" },
  { href: "/settings", label: "Pengaturan", icon: Settings, iconBg: "bg-[#FEF9C3] text-[#D97706]" },
]

const levelConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  BEGINNER: { label: "Explorer", icon: Compass, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  MID: { label: "Builder", icon: Hammer, color: "bg-blue-100 text-blue-800 border-blue-200" },
  ADVANCE: { label: "Creator", icon: Rocket, color: "bg-amber-100 text-amber-800 border-amber-200" },
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-inherit">
      <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-7 w-auto" priority />
    </Link>
  )
}

export function DashboardNav({ user }: Props) {
  const [xp, setXp] = useState(user.xp)
  const [streak, setStreak] = useState(user.streak)
  const pathname = usePathname()

  useEffect(() => {
    const refresh = () =>
      fetch("/api/user/stats")
        .then((r) => r.json())
        .then((d) => {
          if (d.xp != null) {
            setXp(d.xp)
            setStreak(d.streak)
          }
        })
        .catch(() => {})

    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "KV"
  const level = levelConfig[user.level] ?? { label: user.level, icon: BookOpen, color: "bg-muted text-foreground" }
  const LevelIcon = level.icon
  const handleSignOut = () => signOut({ callbackUrl: "/" })

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-muted bg-[#FAFBFC] px-4 py-5 md:flex">
        <div className="mb-7">
          <Logo />
        </div>

        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground/70">
          Menu
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-all hover:translate-x-0.5 hover:bg-white hover:text-foreground hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                  active ? "bg-white font-bold text-foreground shadow-[0_4px_14px_rgba(0,0,0,0.08)]" : "font-medium text-muted-foreground"
                )}
              >
                <span className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[15px]", active ? "kodevo-gradient text-white" : item.iconBg)}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-auto flex items-center gap-2.5 rounded-[10px] bg-[#F9FAFB] p-3 text-left outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="kodevo-gradient text-xs font-bold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{user.name ?? "Pengguna Kodevo"}</div>
              <div className="truncate text-xs text-muted-foreground">
                {user.username ? `@${user.username}` : user.email}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <div className="space-y-1 px-3 py-2.5">
              <p className="text-sm font-semibold leading-none">{user.name ?? "Pengguna"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className={cn("mt-1 text-xs", level.color)}>
                <LevelIcon className="h-3 w-3" />
                {level.label}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            {user.username ? (
              <DropdownMenuItem render={<Link href={`/profile/${user.username}`} target="_blank" />} className="cursor-pointer">
                <UserCircle className="h-4 w-4" />
                Lihat Profil Publik
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer text-muted-foreground">
                <UserCircle className="h-4 w-4" />
                Set Username Profil
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-muted bg-white/95 px-4 backdrop-blur md:hidden">
        <Logo />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Menu className="h-5 w-5" />
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="kodevo-gradient text-xs font-bold text-white">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="space-y-1 px-3 py-2.5">
              <p className="text-sm font-semibold leading-none">{user.name ?? "Pengguna"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            {navItems.map((item) => (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />} className="cursor-pointer">
                <item.icon className="h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  )
}
