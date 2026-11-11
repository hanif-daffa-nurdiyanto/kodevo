import Link from "next/link"
import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[960px] flex-col justify-center">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 self-center text-inherit">
          <Image src="/logo-full.png" alt="Kodevo" width={1710} height={399} className="h-8 w-auto" priority />
        </Link>
        <div className="grid items-center gap-10 md:grid-cols-[1fr_390px]">
          <div className="hidden md:block">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-primary">Belajar lebih cepat</p>
            <h1 className="max-w-[440px] text-[38px] font-extrabold leading-tight">
              Roadmap digital skill yang dipersonalisasi buat tujuanmu.
            </h1>
            <div className="mt-8 grid max-w-[440px] gap-3">
              {["Personalized roadmap", "Adaptive learning style", "Project-based dari hari pertama"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] px-4 py-3 text-sm font-semibold">
                  <span className="kodevo-gradient h-2.5 w-2.5 rounded-full" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center md:justify-end">{children}</div>
        </div>
      </div>
    </div>
  )
}
