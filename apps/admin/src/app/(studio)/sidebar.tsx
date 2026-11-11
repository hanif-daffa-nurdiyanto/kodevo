"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  BarChart3, Filter, RefreshCcw,
  Users, AlertTriangle, CreditCard, BookOpen, Activity, LogOut, Tag, Settings, Flag, Layers, Bug, TrendingUp, Wallet, PackageCheck, Coins,
} from "lucide-react"
import Image from "next/image"
import s from "./sidebar.module.css"

// const webAppUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"

const navSections = [
  {
    label: "Analytics",
    items: [
      { href: "/", label: "Overview", icon: BarChart3, exact: true },
      { href: "/funnel",    label: "Funnel",     icon: Filter,          exact: false },
      { href: "/retention", label: "Retention",  icon: RefreshCcw,      exact: false },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/users",   label: "Users",   icon: Users,         exact: false },
      { href: "/at-risk", label: "At-Risk", icon: AlertTriangle, exact: false },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/finance",      label: "Finance",      icon: CreditCard, exact: false },
      { href: "/payments",     label: "Payments",     icon: Wallet,     exact: false },
      { href: "/pricing",      label: "Pricing",      icon: Coins,      exact: false },
      { href: "/promo-codes",  label: "Promo Codes",  icon: Tag,        exact: false },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/content",    label: "Content",    icon: BookOpen,    exact: false },
      { href: "/bundles",    label: "Bundles",    icon: PackageCheck, exact: false },
      { href: "/curricula",  label: "Curricula",  icon: Layers,      exact: false },
      { href: "/materials",  label: "Materials",  icon: Flag,        exact: false },
      { href: "/trends",     label: "Trends",     icon: TrendingUp,  exact: false },
      { href: "/engagement", label: "Engagement", icon: Activity,    exact: false },
    ],
  },
  {
    label: "Config",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, exact: false },
      { href: "/debug",    label: "Debug",    icon: Bug,      exact: false },
    ],
  },
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: "fixed",
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      width: 220,
      backgroundColor: "#0f172a",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>

      {/* Brand */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        height: 56,
        flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ minWidth: 0 }}>
          <Image
            src="/logo-full.png"
            alt="Kodevo"
            width={1710}
            height={399}
            style={{ display: "block", height: 28, width: "auto", filter: "brightness(0) invert(1)" }}
            priority
          />
          <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.38)", fontSize: 10, lineHeight: 1 }}>
            Admin Studio
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {navSections.map((section, si) => (
          <div key={section.label} style={{ marginTop: si === 0 ? 0 : 16 }}>
            <span style={{
              display: "block",
              padding: "0 10px 5px",
              color: "rgba(255,255,255,0.28)",
              fontSize: 9.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
            }}>
              {section.label}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? s.navLinkActive : s.navLink}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#38bdf8" : "rgba(255,255,255,0.55)",
                      backgroundColor: active ? "rgba(14,165,233,0.16)" : "transparent",
                    }}
                  >
                    <item.icon style={{
                      width: 15,
                      height: 15,
                      flexShrink: 0,
                      color: active ? "#38bdf8" : "rgba(255,255,255,0.30)",
                    }} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: 8,
        flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Temporary: replaced Back to App with logout while admin sessions are isolated. */}
        {/* <a
          href={`${webAppUrl}/dashboard`}
          className={s.backLink}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 12,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14, flexShrink: 0 }} />
          Back to App
        </a> */}
        <button
          type="button"
          className={s.backLink}
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            border: 0,
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
            textDecoration: "none",
            fontSize: 12,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          <LogOut style={{ width: 14, height: 14, flexShrink: 0 }} />
          Logout
        </button>
      </div>

    </aside>
  )
}
