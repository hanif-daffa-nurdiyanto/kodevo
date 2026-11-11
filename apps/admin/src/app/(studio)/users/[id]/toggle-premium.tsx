"use client"

import { useState } from "react"
import { Crown, Loader2, Zap } from "lucide-react"
import { cn } from "@kodevo/utils"

type Tier = "free" | "plus" | "pro"

export function TogglePremiumButton({ userId, isPremium, isPro }: { userId: string; isPremium: boolean; isPro: boolean }) {
  const initialTier: Tier = isPro ? "pro" : isPremium ? "plus" : "free"
  const [tier, setTier] = useState<Tier>(initialTier)
  const [loading, setLoading] = useState(false)

  async function setTierTo(next: Tier) {
    if (next === tier) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/premium`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: next }),
      })
      if (res.ok) setTier(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      {(["free", "plus", "pro"] as Tier[]).map((t) => (
        <button
          key={t}
          onClick={() => setTierTo(t)}
          disabled={loading || tier === t}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors border",
            tier === t
              ? t === "pro"
                ? "bg-violet-50 text-violet-700 border-violet-200"
                : t === "plus"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
          )}
        >
          {t === "pro" ? <Crown className="h-3 w-3" /> : t === "plus" ? <Zap className="h-3 w-3" /> : null}
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  )
}
