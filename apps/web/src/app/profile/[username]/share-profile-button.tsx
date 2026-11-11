"use client"

import { useState } from "react"

export function ShareProfileButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    const title = document.title || "Profil Kodevo"

    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }

      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="h-10 shrink-0 rounded-lg border border-[#E5E7EB] px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
    >
      {copied ? "Tersalin" : "Bagikan Profil"}
    </button>
  )
}
