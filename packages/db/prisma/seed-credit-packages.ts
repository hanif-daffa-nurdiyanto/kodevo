import { getDatabaseUrl } from "./load-env"
import { createPgAdapter } from "../src/adapter"
import { PrismaClient } from "../src/generated/prisma/client"
import { seedDefaultCreditPackages } from "../src/credit-packages"

const adapter = createPgAdapter(getDatabaseUrl())
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding credit packages...")

  const packages = await seedDefaultCreditPackages(db)
  for (const pkg of packages) {
    console.log(`  ✓ ${pkg.label}: ${pkg.credits} credits`)
  }

  console.log("Credit package seed complete.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
