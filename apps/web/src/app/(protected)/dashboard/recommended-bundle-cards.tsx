import Link from "next/link"
import { CheckCircle2, Eye } from "lucide-react"
import { Badge } from "@kodevo/ui/badge"
import { buttonVariants } from "@kodevo/ui/button"
import { cn } from "@kodevo/utils"

export type RecommendedBundleCard = {
  id: string
  slug: string
  icon: string
  cover: string
  title: string
  description: string
  modules: number
  isFree: boolean
  priceIdr: number | null
  purchased: boolean
}

export function RecommendedBundleCards({ bundles }: { bundles: RecommendedBundleCard[] }) {
  return (
    <>
      {bundles.map((bundle) => {
        const formattedPrice = bundle.isFree
          ? "Gratis"
          : bundle.priceIdr
          ? formatRupiah(bundle.priceIdr)
          : "Harga belum tersedia"

        return (
          <div
            key={bundle.id}
            className="flex flex-col gap-3 rounded-xl border border-muted bg-white p-5 text-inherit transition-all hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
          >
            <div className={cn("flex aspect-video items-center justify-center rounded-lg text-2xl", bundle.cover)}>
              {bundle.icon}
            </div>
            <div className="min-h-[98px]">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{bundle.title}</p>
                {bundle.purchased && (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Dibeli
                  </Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{bundle.description}</p>
              <p className="mt-2 text-xs font-semibold text-foreground">
                {bundle.modules} modul · {formattedPrice}
              </p>
            </div>
            <Link href={`/learn/${bundle.slug}`} className={cn(buttonVariants({ size: "sm" }), "mt-auto gap-1.5")}>
              <Eye className="h-4 w-4" />
              Lihat Bundle
            </Link>
          </div>
        )
      })}
    </>
  )
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}
