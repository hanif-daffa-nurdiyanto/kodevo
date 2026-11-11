import { db } from "./client"
import { type PrismaClient } from "./generated/prisma/client"

export type CreditPackageSeed = {
  id: string
  label: string
  description: string
  credits: number
  priceIdr: number
  isActive: boolean
  order: number
}

type CreditPackageClient = Pick<PrismaClient, "creditPackage">

export const DEFAULT_CREDIT_PACKAGES: CreditPackageSeed[] = [
  {
    id: "credit_pkg_starter_250",
    label: "Starter",
    description: "Coba generate roadmap dan beberapa materi.",
    credits: 250,
    priceIdr: 12500,
    isActive: true,
    order: 10,
  },
  {
    id: "credit_pkg_basic_500",
    label: "Basic",
    description: "Untuk belajar ringan beberapa hari.",
    credits: 500,
    priceIdr: 25000,
    isActive: true,
    order: 20,
  },
  {
    id: "credit_pkg_plus_1000",
    label: "Plus",
    description: "Paket standar untuk sesi belajar intensif.",
    credits: 1000,
    priceIdr: 50000,
    isActive: true,
    order: 30,
  },
  {
    id: "credit_pkg_growth_2500",
    label: "Growth",
    description: "Untuk beberapa track custom dan latihan rutin.",
    credits: 2500,
    priceIdr: 125000,
    isActive: true,
    order: 40,
  },
  {
    id: "credit_pkg_power_5000",
    label: "Power",
    description: "Untuk penggunaan AI lebih panjang.",
    credits: 5000,
    priceIdr: 250000,
    isActive: true,
    order: 50,
  },
]

export async function seedDefaultCreditPackages(
  client: CreditPackageClient = db,
  packages: CreditPackageSeed[] = DEFAULT_CREDIT_PACKAGES
): Promise<Array<{ id: string; label: string; credits: number }>> {
  const seeded = []

  for (const pkg of packages) {
    const creditPackage = await client.creditPackage.upsert({
      where: { id: pkg.id },
      update: {
        label: pkg.label,
        description: pkg.description,
        credits: pkg.credits,
        priceIdr: pkg.priceIdr,
        isActive: pkg.isActive,
        order: pkg.order,
      },
      create: pkg,
      select: { id: true, label: true, credits: true },
    })

    seeded.push(creditPackage)
  }

  return seeded
}
