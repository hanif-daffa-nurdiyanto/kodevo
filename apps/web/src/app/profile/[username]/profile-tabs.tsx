"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ExternalLink } from "lucide-react"
import { cn } from "@kodevo/utils"

type CertificateItem = {
  id: string
  title: string
  href: string
  meta: string
  modules: string[]
}

type TrackItem = {
  id: string
  title: string
  icon: string
  pct: number
  meta: string
}

type TabKey = "certificates" | "tracks"

export function PublicProfileTabs({
  certificates,
  tracks,
}: {
  certificates: CertificateItem[]
  tracks: TrackItem[]
}) {
  const [active, setActive] = useState<TabKey>("certificates")
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "certificates", label: "Sertifikat" },
    { key: "tracks", label: "Sedang Dipelajari" },
  ]

  return (
    <>
      <div className="mb-5 flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "border-b-2 pb-3 text-sm transition-colors hover:text-[#00A88A]",
              active === tab.key
                ? "border-[#00C9A7] font-bold text-[#1A1A2E]"
                : "border-transparent font-medium text-[#6B7280]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "certificates" && (
        <section className="flex flex-col gap-3 pb-10">
          {certificates.length > 0 ? (
            certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="rounded-xl border border-[#F3F4F6] px-5 py-[18px] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="kodevo-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-xl">
                    🎓
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{certificate.title}</div>
                    <div className="text-xs text-[#6B7280]">{certificate.meta}</div>
                  </div>
                  <Link
                    href={certificate.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#3D8EF0] hover:text-[#00C9A7]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Lihat
                  </Link>
                </div>
                {certificate.modules.length > 0 && (
                  <div className="mt-4 grid gap-1.5 text-xs text-[#6B7280] sm:grid-cols-2">
                    {certificate.modules.map((moduleTitle) => (
                      <div key={moduleTitle} className="truncate">
                        <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" />
                        {moduleTitle}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3.5 rounded-xl border border-dashed border-[#E5E7EB] px-5 py-[18px]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#F3F4F6] text-xl text-[#9CA3AF]">
                🔒
              </div>
              <div>
                <div className="text-sm font-bold text-[#6B7280]">Belum ada sertifikat</div>
                <div className="text-xs text-[#9CA3AF]">Selesaikan satu track untuk menampilkan sertifikat.</div>
              </div>
            </div>
          )}
        </section>
      )}

      {active === "tracks" && (
        <section className="flex flex-col gap-3 pb-10">
          {tracks.length > 0 ? (
            tracks.map((track) => (
              <div
                key={track.id}
                className="rounded-xl border border-[#F3F4F6] px-5 py-[18px] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EFF6FF] text-base">
                    {track.icon}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{track.title}</span>
                </div>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div className="kodevo-gradient h-full rounded-full" style={{ width: `${track.pct}%` }} />
                </div>
                <div className="text-xs text-[#6B7280]">{track.meta}</div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3.5 rounded-xl border border-dashed border-[#E5E7EB] px-5 py-[18px]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#F3F4F6] text-xl text-[#9CA3AF]">
                📚
              </div>
              <div>
                <div className="text-sm font-bold text-[#6B7280]">Belum ada track aktif</div>
                <div className="text-xs text-[#9CA3AF]">Track yang sedang dipelajari akan muncul di sini.</div>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
