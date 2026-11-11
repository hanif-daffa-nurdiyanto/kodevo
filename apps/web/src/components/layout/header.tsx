"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button, buttonVariants } from "@kodevo/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@kodevo/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@kodevo/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kodevo/ui/dropdown-menu"
import { Menu, LayoutDashboard, LogOut } from "lucide-react"
import { cn } from "@kodevo/utils"
import { AIUsageCounter } from "@/components/ai-usage-counter"

const navLinks = [
  { href: "/#fitur", label: "Fitur" },
  { href: "/#cara-kerja", label: "Cara Kerja" },
  { href: "/#bundle", label: "Bundle" },
  { href: "/#harga", label: "Harga" },
]

interface Props {
  user?: { name?: string | null; image?: string | null } | null
}

export function Header({ user }: Props) {
  const pathname = usePathname()
  const isLanding = pathname === "/"
  const [open, setOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "VL"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-muted bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-[65px] max-w-[1216px] items-center justify-between px-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        {isLanding && (
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-kodevo-green"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop right */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {!isLanding && <AIUsageCounter className="mr-1" />}
              <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Dashboard
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center rounded-full outline-none ring-ring focus-visible:ring-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user.name ?? "Pengguna"}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/dashboard" />} className="cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Masuk
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "h-10 px-5")}>
                Mulai Gratis
              </Link>
            </>
          )}
        </div>

        {/* Mobile nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Buka menu"
            className={cn(
              "md:hidden",
              buttonVariants({ variant: "ghost", size: "icon" }),
              "border border-transparent hover:border-border hover:bg-muted"
            )}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(88vw,22rem)] overflow-y-auto border-l border-border bg-white px-5 pb-6 pt-5 shadow-[-16px_0_40px_rgba(26,26,46,0.12)]"
          >
            <div className="flex min-h-full flex-col gap-6">
              <SheetHeader className="p-0 pr-10">
                <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
                <Link href="/" className="flex w-fit items-center gap-2" onClick={() => setOpen(false)}>
                  <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto" priority />
                </Link>
              </SheetHeader>



              {isLanding && (
                <nav className="flex flex-col gap-1 border-y border-border py-4">

                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}



              <div className="grid gap-2">
                {user && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{user.name ?? "Pengguna"}</p>
                    </div>
                  </div>
                )}
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={cn(buttonVariants(), "w-full")}
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard className="mr-1.5 h-4 w-4" />
                      Dashboard
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }) }}
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Keluar
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className={cn(buttonVariants(), "w-full")}
                      onClick={() => setOpen(false)}
                    >
                      Mulai Gratis
                    </Link>
                    <Link
                      href="/login"
                      className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                      onClick={() => setOpen(false)}
                    >
                      Masuk
                    </Link>
                  </>
                )}
              </div>


              <div className="mt-auto flex flex-col gap-3">



              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
