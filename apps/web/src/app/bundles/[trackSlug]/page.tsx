import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronLeft, Lock, Sparkles } from "lucide-react"
import { auth } from "@kodevo/auth"
import { Badge } from "@kodevo/ui/badge"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { cn } from "@kodevo/utils"
import { db, TrackType } from "@kodevo/db"
import { BundleCheckoutButton } from "@/components/bundle-checkout-button"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"

function formatRupiah(value: number | null): string {
  if (!value) return "Harga segera hadir"
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function loginHref(callbackUrl: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
}

export default async function PublicBundleDetailPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>
}) {
  const { trackSlug } = await params
  const session = await auth()
  const sessionUser = session?.user as { id?: string | null; email?: string | null; name?: string | null; image?: string | null } | undefined
  const user = sessionUser
    ? { name: sessionUser.name, image: sessionUser.image }
    : null

  const [track, dbUser] = await Promise.all([
    db.track.findUnique({
      where: { slug: trackSlug },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        icon: true,
        type: true,
        isFree: true,
        priceIdr: true,
        hasCertificate: true,
        publishedAt: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            topics: { select: { id: true } },
          },
        },
      },
    }),
    sessionUser?.id
      ? db.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
      : sessionUser?.email
      ? db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } })
      : null,
  ])

  if (!track || track.type !== TrackType.BUNDLE || !track.publishedAt) notFound()

  const purchase = dbUser && !track.isFree
    ? await db.bundlePurchase.findUnique({
        where: { userId_trackId: { userId: dbUser.id, trackId: track.id } },
        select: { id: true },
      })
    : null
  const isPurchased = Boolean(purchase)
  const totalTopics = track.modules.reduce((sum, mod) => sum + mod.topics.length, 0)
  const price = track.isFree ? "Gratis" : formatRupiah(track.priceIdr)
  const learnHref = `/learn/${track.slug}`

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header user={user} />
      <main className="flex-1">
        <section className="border-b border-border bg-[radial-gradient(ellipse_900px_500px_at_50%_-10%,rgba(0,201,167,0.10),transparent),radial-gradient(ellipse_700px_400px_at_80%_20%,rgba(61,142,240,0.08),transparent)] px-4 pb-12 pt-24">
          <div className="mx-auto max-w-6xl">
            <Link href="/#bundle" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
              Bundle
            </Link>
            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#F0FDF4] text-3xl text-kodevo-green">
                  {track.icon ?? "📚"}
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant={track.isFree ? "explorer" : "builder"}>{price}</Badge>
                  <Badge variant="outline">{track.modules.length} modul</Badge>
                  <Badge variant="outline">{totalTopics} topik</Badge>
                  {track.hasCertificate && <Badge variant="creator">Sertifikat</Badge>}
                </div>
                <h1 className="max-w-3xl text-[42px] font-extrabold leading-tight md:text-[56px]">{track.title}</h1>
                <p className="mt-5 max-w-2xl text-[17px] leading-8 text-muted-foreground">{track.description}</p>
              </div>

              <Card className="border-[#F3F4F6] shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-kodevo-green">Mulai Bundle</p>
                    <p className="mt-2 text-3xl font-extrabold">{price}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Lihat detailnya bebas. Login hanya diperlukan saat kamu mulai belajar atau membeli bundle.
                    </p>
                  </div>

                  {!dbUser ? (
                    track.isFree ? (
                      <Link href={loginHref(learnHref)} className={cn(buttonVariants(), "h-[46px] w-full gap-1.5")}>
                        Mulai Belajar
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link href={loginHref(`/bundles/${track.slug}`)} className={cn(buttonVariants(), "h-[46px] w-full gap-1.5")}>
                        Masuk untuk Beli
                        <Lock className="h-4 w-4" />
                      </Link>
                    )
                  ) : track.isFree || isPurchased ? (
                    <Link href={learnHref} className={cn(buttonVariants(), "h-[46px] w-full gap-1.5")}>
                      {isPurchased ? "Lanjut Belajar" : "Mulai Belajar"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <BundleCheckoutButton
                      trackId={track.id}
                      title={track.title}
                      description={track.description}
                      priceIdr={track.priceIdr}
                      moduleCount={track.modules.length}
                      disabled={!track.priceIdr || track.priceIdr <= 0}
                      className="w-full"
                      buttonClassName="w-full"
                    />
                  )}

                  <div className="rounded-lg bg-[#F8FBFF] p-4 text-sm text-muted-foreground">
                    {track.isFree
                      ? "Bundle gratis bisa dimulai tanpa checkout setelah login."
                      : isPurchased
                      ? "Bundle sudah dibeli. Generate materi di bundle ini tidak memotong credit."
                      : "Setelah bundle dibeli, generate materi di bundle ini tidak memotong credit."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Materi Bundle</p>
                <h2 className="mt-2 text-2xl font-extrabold">Yang akan kamu pelajari</h2>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{track.modules.length} modul · {totalTopics} topik</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {track.modules.map((mod) => (
                <Card key={mod.id} className="border-[#F3F4F6] bg-white">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-sm font-bold text-primary">
                      {mod.order}
                    </div>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold">{mod.title}</h3>
                        {mod.topics.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {mod.topics.length} topik
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{mod.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {track.modules.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-muted p-10 text-center text-sm text-muted-foreground">
                Modul bundle sedang disiapkan.
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center rounded-2xl bg-[#0F172A] px-6 py-12 text-center text-white">
            <Sparkles className="mb-4 h-8 w-8 text-kodevo-green" />
            <h2 className="text-3xl font-extrabold">Siap mulai dari bundle ini?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
              Kamu bisa cek detailnya dulu. Saat mulai belajar atau checkout, sistem akan meminta login.
            </p>
            <div className="mt-6">
              {!dbUser ? (
                <Link href={loginHref(track.isFree ? learnHref : `/bundles/${track.slug}`)} className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}>
                  {track.isFree ? "Mulai Belajar" : "Masuk untuk Beli"}
                  {track.isFree ? <ArrowRight className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </Link>
              ) : track.isFree || isPurchased ? (
                <Link href={learnHref} className={cn(buttonVariants({ size: "lg" }), "gap-1.5")}>
                  {isPurchased ? "Lanjut Belajar" : "Mulai Belajar"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <BundleCheckoutButton
                  trackId={track.id}
                  title={track.title}
                  description={track.description}
                  priceIdr={track.priceIdr}
                  moduleCount={track.modules.length}
                  disabled={!track.priceIdr || track.priceIdr <= 0}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
