import { requireAdmin, fmtNumber } from "@kodevo/auth/admin"
import { DEFAULT_CREDIT_SETTINGS, db, getCreditPricing, type CreditSettingKey } from "@kodevo/db"
import { Coins, Gauge, PackagePlus } from "lucide-react"
import { PageHeader } from "../_components/page-header"
import { SectionCard } from "../_components/section-card"
import { StatCard } from "../_components/stat-card"
import { ActionCostForm, CreditPackageCreateButton, CreditPackageRows } from "./pricing-admin-actions"

function fmtRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

const actionCostKeys = [
  "credit_cost_curriculum",
  "credit_cost_material",
  "credit_cost_quiz",
  "credit_cost_exercise_generate",
  "credit_cost_exercise_submit",
  "credit_cost_project",
  "credit_cost_chat",
] as const satisfies CreditSettingKey[]

export default async function StudioPricingPage() {
  await requireAdmin()

  const [packages, pricing] = await Promise.all([
    db.creditPackage.findMany({
      orderBy: [{ order: "asc" }, { credits: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        description: true,
        credits: true,
        priceIdr: true,
        isActive: true,
        order: true,
      },
    }),
    getCreditPricing(),
  ])

  const activePackages = packages.filter((pkg) => pkg.isActive)
  const cheapestPackage = activePackages.reduce<(typeof packages)[number] | null>(
    (lowest, pkg) => (!lowest || pkg.priceIdr < lowest.priceIdr ? pkg : lowest),
    null
  )
  const actionCosts = actionCostKeys.map((key) => ({
    key,
    label: key,
    value: pricing[key] ?? DEFAULT_CREDIT_SETTINGS[key],
  }))

  return (
    <div>
      <PageHeader title="Pricing" description="Kelola paket top-up credit dan biaya credit untuk setiap action AI." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Active Packages"
          value={fmtNumber(activePackages.length)}
          sub={`${fmtNumber(packages.length)} total paket`}
          icon={PackagePlus}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Cheapest Top-up"
          value={cheapestPackage ? fmtRp(cheapestPackage.priceIdr) : "—"}
          sub={cheapestPackage ? `${fmtNumber(cheapestPackage.credits)} credits` : "Belum ada paket aktif"}
          icon={Coins}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="AI Cost Rules"
          value={fmtNumber(actionCostKeys.length)}
          sub="Dipakai saat debit credit"
          icon={Gauge}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
      </div>

      <div className="mb-6">
        <SectionCard title="Cost Per Action" description="Nilai ini menentukan jumlah credit yang dipotong untuk setiap fitur AI.">
          <ActionCostForm costs={actionCosts} />
        </SectionCard>
      </div>

      <SectionCard
        title="Paket Top-up Credit"
        description="Paket aktif akan tampil di landing pricing dan halaman /credits."
        action={<CreditPackageCreateButton />}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Paket</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Credits</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Harga</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Order</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <CreditPackageRows packages={packages} />
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
