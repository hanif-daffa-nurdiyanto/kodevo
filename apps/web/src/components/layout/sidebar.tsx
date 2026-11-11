"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@kodevo/ui/avatar"
import { LayoutDashboard, BookOpen, Settings, LogOut, Flame, Zap, Sparkles, Compass, Hammer, Rocket, type LucideIcon } from "lucide-react"
import Image from "next/image"
import { cn } from "@kodevo/utils"

interface Props {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    level: string
    isPremium: boolean
    xp: number
    streak: number
  }
}

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/learn",      label: "Belajar",    icon: BookOpen },
  { href: "/settings",   label: "Pengaturan", icon: Settings },
]

const levelConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  BEGINNER: { label: "Beginner", icon: Compass, color: "text-emerald-600" },
  MID: { label: "Intermediate", icon: Hammer, color: "text-blue-600" },
  ADVANCE: { label: "Advanced", icon: Rocket, color: "text-violet-600" },
}

export function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "CM"
  const level = levelConfig[user.level] ?? { label: user.level, icon: BookOpen, color: "text-foreground" }
  const LevelIcon = level.icon

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-white border-r border-border/60">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto shrink-0" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "kodevo-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Streak + XP */}
      <div className="px-4 pb-3">
        <div className="rounded-2xl bg-muted/60 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Streak</span>
            <span className={cn(
              "flex items-center gap-1 text-sm font-bold",
              user.streak > 0 ? "text-orange-500" : "text-muted-foreground"
            )}>
              <Flame className="h-3.5 w-3.5" />{user.streak}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">XP</span>
            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
              <Zap className="h-3.5 w-3.5" />{user.xp.toLocaleString()}
            </span>
          </div>
          {!user.isPremium && (
            <Link
              href="/credits"
              className="block w-full rounded-lg bg-primary/10 py-1.5 text-center text-xs font-semibold text-primary hover:bg-primary/20 transition-colors mt-1"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              Top-up Credit
            </Link>
          )}
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold leading-none">{user.name ?? "Pengguna"}</p>
            <p className={cn("text-xs font-medium mt-0.5", level.color)}>
              <LevelIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              {level.label}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Keluar"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
