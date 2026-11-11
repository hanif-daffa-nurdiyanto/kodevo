import Link from "next/link"
import { ArrowRight, Hammer, Sparkles, Target } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Badge } from "@kodevo/ui/badge"
import { buttonVariants } from "@kodevo/ui/button"
import { Card, CardContent } from "@kodevo/ui/card"
import { auth } from "@kodevo/auth"
import { cn } from "@kodevo/utils"
import { db, TrackType } from "@kodevo/db"

const differentiators = [
  {
    title: "Roadmap personal",
    desc: "AI generate kurikulum berdasarkan tujuanmu, bukan template yang sama untuk semua orang.",
    icon: Target,
    tone: "bg-[#F0FDF4] text-kodevo-green",
  },
  {
    title: "Adaptive learning",
    desc: "Materi menyesuaikan level dan gaya belajarmu, bukan kecepatan orang lain.",
    icon: Sparkles,
    tone: "bg-[#EFF6FF] text-kodevo-blue",
  },
  {
    title: "Project-based",
    desc: "Belajar langsung membangun sesuatu nyata sejak hari pertama, bukan cuma nonton video.",
    icon: Hammer,
    tone: "bg-[#FEF9C3] text-[#D97706]",
  },
]

const steps = [
  {
    title: "Ceritakan tujuanmu",
    desc: "Pilih bundle siap pakai, atau tulis bebas apa yang ingin kamu capai.",
  },
  {
    title: "Dapat roadmap personal",
    desc: "Screening singkat membantu Kodevo menyesuaikan level dan gaya belajar.",
  },
  {
    title: "Belajar sambil membangun",
    desc: "Baca materi, cek pemahaman, kerjakan project, lalu lanjut ke modul berikutnya.",
  },
]

const bundleCovers = [
  "bg-[repeating-linear-gradient(135deg,#F0FDF4,#F0FDF4_8px,#ECFDF5_8px,#ECFDF5_16px)] text-[#00A88A]",
  "bg-[repeating-linear-gradient(135deg,#EFF6FF,#EFF6FF_8px,#E8F1FE_8px,#E8F1FE_16px)] text-kodevo-blue",
  "bg-[repeating-linear-gradient(135deg,#FEF9C3,#FEF9C3_8px,#FDF4B0_8px,#FDF4B0_16px)] text-[#B45309]",
  "bg-[repeating-linear-gradient(135deg,#F0FDF4,#F0FDF4_8px,#EAF2FE_8px,#EAF2FE_16px)] text-[#00A88A]",
]

const testimonials = [
  {
    quote: "Roadmap-nya beneran ngikutin tujuan gue, bukan kurikulum template. Minggu pertama udah bikin project sendiri.",
    name: "Rizky A.",
    track: "Track Frontend Developer",
    initials: "RA",
  },
  {
    quote: "Suka banget materinya nyesuaiin level. Gue skip basic karena udah familiar, langsung ke bagian yang gue butuh.",
    name: "Sarah N.",
    track: "Track Data Analyst",
    initials: "SN",
  },
  {
    quote: "Project-based-nya kerasa banget bedanya. Portofolio gue kebentuk otomatis sambil belajar.",
    name: "Dimas P.",
    track: "Track AI Engineering",
    initials: "DP",
  },
]

const landingCardClass = "border border-[#F3F4F6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
const bundleCardClass = "border border-[#F3F4F6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]"

export default async function LandingPage() {
  const [session, bundleTracks, creditPackages] = await Promise.all([
    auth(),
    db.track.findMany({
      where: { type: TrackType.BUNDLE, publishedAt: { not: null } },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        isFree: true,
        priceIdr: true,
        hasCertificate: true,
        modules: { select: { id: true } },
      },
    }),
    db.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { credits: "asc" }],
      take: 5,
      select: { id: true, label: true, description: true, credits: true, priceIdr: true },
    }),
  ])
  const user = session?.user
    ? { name: (session.user as { name?: string | null }).name, image: (session.user as { image?: string | null }).image }
    : null
  const bundleHref = user ? "/learn" : "/register"

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingAnimationStyles />
      <Header user={user} />

      <section className="border-b border-border bg-[radial-gradient(ellipse_900px_500px_at_50%_-10%,rgba(0,201,167,0.10),transparent),radial-gradient(ellipse_700px_400px_at_80%_20%,rgba(61,142,240,0.08),transparent)] px-4 pb-20 pt-24 text-center">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-[900px]">
            <h1 className="text-[48px] font-extrabold leading-[1.05] md:text-[64px]">
              Belajar lebih cepat dengan <span className="kodevo-gradient-text">Kodevo</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[620px] text-[19px] leading-[1.6] text-muted-foreground">
              Ceritakan apa yang mau kamu pelajari. Kami buatkan roadmap personal dan kamu langsung praktek dari hari pertama.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href={user ? "/learn" : "/register"} className={buttonVariants({ size: "lg" }) + " gap-2 px-8"}>
                Mulai Gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#bundle" className={buttonVariants({ variant: "outline", size: "lg" }) + " px-8"}>
                Lihat Bundle Tersedia
              </Link>
            </div>
            <p className="mt-4 text-xs font-medium text-muted-foreground">Gratis untuk mulai. Tanpa kartu kredit.</p>
          </div>

          <div className="mx-auto mt-[72px] max-w-[880px] animate-[landing-floaty_6s_ease-in-out_infinite] rounded-2xl border border-muted bg-white text-left shadow-[0_30px_70px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-kodevo-green" />
            </div>
            <div className="p-5 md:p-9">
              <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-heading text-lg font-bold">Roadmap: Jadi Frontend Developer</p>
                  <p className="mt-1 text-sm text-muted-foreground">8 modul. Project-based learning.</p>
                </div>
                <Badge variant="explorer" className="h-7 px-3 text-xs font-bold">32% selesai</Badge>
              </div>
              <div className="mb-7 h-2 overflow-hidden rounded-full bg-muted">
                <div className="kodevo-gradient h-full w-[32%] rounded-full" />
              </div>
              <div className="space-y-3">
                <RoadmapItem done title="HTML & CSS Fundamentals" status="Selesai" />
                <RoadmapItem active title="JavaScript Interaktif" status="Sedang belajar" />
                <RoadmapItem title="React & Component Thinking" status="Terkunci" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-t border-muted px-4 py-10">
        <p className="mb-5 text-center text-[13px] font-semibold tracking-[0.02em] text-muted-foreground">
          DIPERCAYA UNTUK BELAJAR SKILL DIGITAL PALING DICARI
        </p>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-12 gap-y-3 font-heading text-lg font-bold text-muted-foreground opacity-50">
          <span>Frontend</span>
          <span>Data Analyst</span>
          <span>Product Design</span>
          <span>Backend</span>
          <span>AI Engineering</span>
        </div>
      </section>

      <section id="fitur" className="px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Kenapa Kodevo</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Bukan kurikulum generik lagi</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {differentiators.map((item) => (
              <Card key={item.title} className={landingCardClass}>
                <CardContent className="p-8">
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="bg-muted px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kodevo-green">Cara Kerja</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Tiga langkah, langsung praktek</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className={landingCardClass}>
                <CardContent className="px-7 py-8">
                  <p className="kodevo-gradient-text font-heading text-4xl font-extrabold">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-4 font-heading text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["12rb+", "Learner aktif belajar"],
            ["30rb+", "Project nyata diselesaikan"],
            ["4.8/5", "Rating dari learner"],
            ["15+", "Bundle siap pakai"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="kodevo-gradient-text font-heading text-4xl font-extrabold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="bundle" className="bg-muted px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-kodevo-green">Bundle Populer</p>
              <h2 className="mt-3 text-[40px] font-extrabold leading-tight">Mulai dari bundle siap pakai</h2>
            </div>
            <Link href={bundleHref} className="text-sm font-bold text-primary hover:text-kodevo-green">
              Lihat semua bundle →
            </Link>
          </div>
          {bundleTracks.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {bundleTracks.map((bundle, index) => {
                const price = bundle.isFree
                  ? "Gratis"
                  : bundle.priceIdr
                  ? new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(bundle.priceIdr)
                  : "Harga segera hadir"
                return (
                  <Link key={bundle.id} href={`/bundles/${bundle.slug}`} className="block text-inherit">
                    <Card className={bundleCardClass}>
                      <CardContent className="flex h-full flex-col gap-3.5 p-6">
                        <div className={`flex aspect-[16/10] items-center justify-center rounded-lg text-3xl ${bundleCovers[index % bundleCovers.length]}`}>
                          {bundle.icon ?? "📚"}
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-bold">{bundle.title}</h3>
                          <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{bundle.description}</p>
                          <p className="mt-2 text-[13px] font-semibold text-foreground">
                            {bundle.modules.length} modul · {price}
                          </p>
                        </div>
                        <Badge variant={bundle.hasCertificate ? "builder" : "explorer"} className="mt-auto">
                          {bundle.hasCertificate ? "Sertifikat" : "Project-based"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
              Bundle belum tersedia.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white px-4 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kodevo-green">Kata Mereka</p>
            <h2 className="mt-3 text-[40px] font-extrabold leading-tight">Belajar cepat, bukan cuma janji</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className={landingCardClass}>
                <CardContent className="flex h-full flex-col gap-4 p-7">
                  <p className="text-[15px] leading-7 text-foreground">&ldquo;{item.quote}&rdquo;</p>
                  <div className="mt-auto flex items-center gap-2.5">
                    <div className="kodevo-gradient flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white">
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.track}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="harga" className="relative mx-auto max-w-6xl overflow-hidden px-4 py-20 md:py-24">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(0,201,167,0.08),transparent_70%)]" />
        <div className="relative mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Harga</p>
          <h2 className="mt-3 text-[40px] font-extrabold leading-tight">Mulai gratis, tambah credit saat perlu</h2>
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PricingCard title="Mulai Gratis" price="Rp0" desc="Untuk eksplorasi awal" items={["Buat roadmap pertama", "Coba materi dan quiz", "Belajar sesuai level"]} cta="Mulai Gratis" href={user ? "/learn" : "/register"} />
          {creditPackages.map((pkg, index) => (
            <PricingCard
              key={pkg.id}
              premium={index === 2}
              title={`${pkg.credits.toLocaleString("id-ID")} Credits`}
              price={formatRupiah(pkg.priceIdr)}
              desc={pkg.description ?? "Untuk aksi AI dan belajar personal"}
              items={["Generate roadmap", "Generate materi dan quiz", "Exercise, project, chat tutor"]}
              cta="Top-up Credit"
              href={user ? "/credits" : "/register"}
            />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24 text-center">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#00C9A7,#3D8EF0)] opacity-[0.06]" />
        <div className="relative">
          <h2 className="text-[40px] font-extrabold leading-tight">Siap belajar lebih cepat?</h2>
          <p className="mt-4 text-base text-muted-foreground">Gratis untuk mulai. Roadmap pertamamu siap dalam hitungan menit.</p>
          <Link href={user ? "/learn" : "/register"} className={buttonVariants({ size: "lg" }) + " mt-8 gap-2 px-8"}>
            Mulai Gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function RoadmapItem({
  title,
  status,
  done = false,
  active = false,
}: {
  title: string
  status: string
  done?: boolean
  active?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-[18px] py-4",
        done && "border-2 border-[#00C9A7] bg-[#F0FDF4]",
        active && "border-[#EFF6FF] bg-[#F8FBFF]",
        !done && !active && "border-[#F3F4F6] bg-white opacity-55"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold",
          done ? "kodevo-gradient text-white" : active ? "animate-[landing-pulse-glow_2s_ease-in-out_infinite] bg-[#3D8EF0] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"
        )}
      >
        {done ? "✓" : active ? "⚡" : "🔒"}
      </div>
      <p className="min-w-0 flex-1 text-[15px] font-semibold">{title}</p>
      <span className={cn("text-xs font-bold", active ? "text-[#3D8EF0]" : done ? "text-[#00A88A]" : "text-[#6B7280]")}>{status}</span>
    </div>
  )
}

function LandingAnimationStyles() {
  return (
    <style>{`
      @keyframes landing-floaty {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-12px); }
      }

      @keyframes landing-pulse-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(61, 142, 240, 0.35); }
        50% { box-shadow: 0 0 0 8px rgba(61, 142, 240, 0); }
      }
    `}</style>
  )
}

function PricingCard({
  title,
  price,
  desc,
  items,
  cta,
  href,
  premium = false,
}: {
  title: string
  price: string
  desc: string
  items: string[]
  cta: string
  href: string
  premium?: boolean
}) {
  return (
    <Card
      className={cn(
        "relative overflow-visible rounded-2xl transition-all duration-300",
        premium
          ? "scale-[1.03] border-0 bg-[linear-gradient(160deg,#1A1A2E,#22223d)] text-white shadow-[0_24px_60px_rgba(61,142,240,0.25)]"
          : "border border-[#F3F4F6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
      )}
    >
      {premium && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="kodevo-gradient absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-25 blur-xl" />
          </div>
          <div className="kodevo-gradient absolute -top-3 right-8 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-[0_4px_12px_rgba(0,201,167,0.35)]">
            🔥 Paling populer
          </div>
        </>
      )}
      <CardContent className="relative p-8 md:p-10">
        <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-lg", premium ? "bg-white/10" : "bg-muted")}>
          {premium ? "🚀" : "🌱"}
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className={cn("mt-1 text-sm", premium ? "text-gray-400" : "text-muted-foreground")}>{desc}</p>
        <div className="mb-7 mt-6 flex items-baseline gap-1">
          <span className={cn("font-heading text-[36px] font-extrabold leading-none md:text-[40px]", premium && "kodevo-gradient-text")}>{price}</span>
        </div>
        <ul className="mb-8 space-y-3.5 text-left">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold", premium ? "bg-kodevo-green/15 text-kodevo-green" : "bg-[#F0FDF4] text-kodevo-green")}>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className={premium ? buttonVariants() + " h-[46px] w-full" : buttonVariants({ variant: "outline" }) + " h-[46px] w-full"}>
          {cta}
        </Link>
      </CardContent>
    </Card>
  )
}
