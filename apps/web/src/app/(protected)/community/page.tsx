import Link from "next/link"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { BookOpen, ExternalLink, Lock, Users } from "lucide-react"
import { auth } from "@kodevo/auth"
import { db } from "@kodevo/db"
import { redirect } from "next/navigation"
import { cn } from "@kodevo/utils"

export default async function CommunityPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sessionUser = session.user as { id?: string | null; email?: string | null }
  const dbUser = sessionUser.id
    ? await db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : sessionUser.email
    ? await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
    : null
  if (!dbUser) redirect("/login")

  const bundlePurchase = await db.bundlePurchase.findFirst({
    where: { userId: dbUser.id },
    select: { id: true },
  })
  const hasBundlePurchase = Boolean(bundlePurchase)

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 md:px-6">
      <div className="mb-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#EFF6FF]">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-[28px] font-extrabold leading-tight">Komunitas Kodevo</h1>
        <p className="mt-2 max-w-[560px] text-sm leading-6 text-muted-foreground">
          Tempat diskusi, tanya jawab, dan belajar bareng member lain tanpa terasa formal.
        </p>
      </div>

      {hasBundlePurchase ? (
        <>
          <Card className="border-[#F3F4F6] shadow-none">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10">
                <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.081.11 18.104.12 18.125a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Discord Server Kodevo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Channel khusus learner yang sudah membeli bundle</p>
              </div>
              <a
                href="https://discord.gg/codemy"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
              >
                Gabung <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="border-dashed border-[#E5E7EB] shadow-none">
            <CardContent className="p-8">
              <Lock className="mb-3 h-8 w-8 text-primary" />
              <p className="mb-1 font-bold">Community terkunci</p>
              <p className="mb-6 max-w-[520px] text-sm leading-6 text-muted-foreground">
                Community terbuka setelah kamu membeli minimal satu bundle belajar.
              </p>
              <Link href="/learn?filter=bundle" className={cn(buttonVariants(), "w-full max-w-xs")}>
                <BookOpen className="mr-2 h-4 w-4" />
                Lihat Bundle
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
