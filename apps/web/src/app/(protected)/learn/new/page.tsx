import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { ChevronLeft, Sparkles } from "lucide-react"
import { CurriculumGenerator } from "@/components/curriculum-generator"
import { AIUsageCounter } from "@/components/ai-usage-counter"

export default async function NewCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string; screened?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, level: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true, level: true } })
    : null
  if (!dbUser) redirect("/login")

  const params = await searchParams
  const curriculumCount = await db.track.count({ where: { userId: dbUser.id } })

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-10 md:px-6">
      {curriculumCount > 0 && (
        <Link
          href="/learn"
          className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-6"}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Lanjut Belajar
        </Link>
      )}

      <div className="kodevo-gradient relative overflow-hidden rounded-2xl px-6 py-7 text-white md:px-8">
        <div className="absolute -top-10 right-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">AI Curriculum</span>
              </div>
              <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]">Mau belajar apa?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">
                Ceritakan tujuan belajarmu, AI akan merancang roadmap personal dari nol sampai siap praktek.
              </p>
            </div>
            <AIUsageCounter className="h-9 shrink-0 rounded-full bg-white px-4 text-primary" />
          </div>

          <CurriculumGenerator
            initialGoal={params.goal ?? ""}
            screenedGoal={params.screened === "1" ? params.goal ?? "" : ""}
          />
        </div>
      </div>
    </div>
  )
}
