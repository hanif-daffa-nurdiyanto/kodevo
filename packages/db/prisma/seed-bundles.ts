import { getDatabaseUrl } from "./load-env"
import { createPgAdapter } from "../src/adapter"
import { PrismaClient } from "../src/generated/prisma/client"
import { seedDefaultBundleTracks } from "../src/bundles"

const adapter = createPgAdapter(getDatabaseUrl())
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding shared bundle tracks...")

  const tracks = await seedDefaultBundleTracks(db)
  for (const track of tracks) {
    console.log(`  ✓ Bundle track: ${track.slug}`)
  }

  console.log("Bundle seed complete.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
