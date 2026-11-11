"use client"

import { useState } from "react"
import { Button } from "@kodevo/ui/button"
import { Crown, Loader2 } from "lucide-react"
import { cn } from "@kodevo/utils"

interface Props {
  className?: string
  label?: string
}

export function UpgradeButton({ className, label = "Upgrade ke Premium" }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      className={cn("bg-amber-500 hover:bg-amber-600 text-white", className)}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Crown className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  )
}
