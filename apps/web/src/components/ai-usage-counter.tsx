"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Coins } from "lucide-react"
import { cn } from "@kodevo/utils"

interface BalanceData {
  balance: number
  updatedAt: string | null
}

interface Props {
  dailyRemaining?: number | null
  weeklyRemaining?: number | null
  className?: string
}

export function AIUsageCounter({ className }: Props) {
  const [balance, setBalance] = useState<BalanceData | null>(null)

  useEffect(() => {
    const refresh = () =>
      fetch("/api/credit/balance")
        .then((r) => {
          if (!r.ok) return null
          return r.json()
        })
        .then((data) => {
          if (data) setBalance(data)
        })
        .catch(() => {})

    refresh()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  if (!balance) return null

  const isEmpty = balance.balance <= 0
  const isLow = !isEmpty && balance.balance < 100

  return (
    <Link
      href="/credits"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-semibold tabular-nums",
        "transition-colors hover:bg-[#EFF6FF]",
        isEmpty ? "text-destructive" : isLow ? "text-amber-700" : "text-[#00A88A]",
        className
      )}
      title="Saldo credit"
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{balance.balance.toLocaleString("id-ID")} credit</span>
    </Link>
  )
}
