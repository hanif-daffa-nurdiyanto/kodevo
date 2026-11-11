"use client"

import { type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@kodevo/utils"

type TabKey = "profile" | "github"

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "github", label: "GitHub" },
]

export function SettingsTabs({
  profile,
  github,
}: {
  profile: ReactNode
  github: ReactNode
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const active: TabKey = tabParam === "github"
    ? "github"
    : "profile"

  function updateTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    window.history.pushState(null, "", `/settings?${params.toString()}`)
  }

  return (
    <>
      <div className="mb-8 mt-7 flex gap-1 border-b border-[#F3F4F6]" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => updateTab(tab.key)}
            className={cn(
              "mr-6 border-b-2 px-1 pb-3 text-sm transition-colors hover:text-[#00A88A]",
              active === tab.key
                ? "border-kodevo-green font-bold text-foreground"
                : "border-transparent font-medium text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "profile" && profile}
      {active === "github" && github}
    </>
  )
}
