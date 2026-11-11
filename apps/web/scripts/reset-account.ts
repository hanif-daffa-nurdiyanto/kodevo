/**
 * Reset akun user — hapus progress belajar, pertahankan isPremium.
 * Usage: npx tsx scripts/reset-account.ts <email>
 */
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@kodevo/db"

const email = process.argv[2]
if (!email) {
  console.error("Usage: npx tsx scripts/reset-account.ts <email>")
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL!
  const { Pool } = await import("pg")
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const db = new PrismaClient({ adapter })

  const user = await db.user.findUnique({ where: { email }, select: { id: true, isPremium: true, name: true } })
  if (!user) {
    console.error(`User tidak ditemukan: ${email}`)
    process.exit(1)
  }

  console.log(`Reset akun: ${user.name} (${email}), isPremium=${user.isPremium}`)

  await db.$transaction([
    db.screeningResult.deleteMany({ where: { userId: user.id } }),
    db.trackAssessment.deleteMany({ where: { userId: user.id } }),
    db.enrollment.deleteMany({ where: { userId: user.id } }),
    db.testSubmission.deleteMany({ where: { userId: user.id } }),
    db.exercise.deleteMany({ where: { userId: user.id } }),
    db.generatedMaterial.deleteMany({ where: { userId: user.id } }),
    db.streak.deleteMany({ where: { userId: user.id } }),
    db.aIUsage.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: {
        level: "UNSCREENED",
        xp: 0,
        learningStyle: null,
        guidancePreference: null,
      },
    }),
  ])

  console.log(`✓ Reset selesai. isPremium tetap: ${user.isPremium}`)
  await db.$disconnect()
  pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
