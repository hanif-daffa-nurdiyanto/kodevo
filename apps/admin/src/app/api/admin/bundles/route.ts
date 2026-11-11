import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@kodevo/auth/admin"
import { db, TrackType } from "@kodevo/db"
import { z } from "zod"

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(800),
  icon: z.string().trim().max(16).nullable().optional(),
  priceIdr: z.number().int().min(0).nullable().optional(),
  hasCertificate: z.boolean().default(false),
  isFree: z.boolean().default(false),
})

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = toSlug(title) || "bundle"
  let slug = base
  let suffix = 2

  while (await db.track.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  return slug
}

async function getTopOrder(): Promise<number> {
  const aggregate = await db.track.aggregate({
    where: { type: TrackType.BUNDLE },
    _min: { order: true },
  })

  return (aggregate._min.order ?? 0) - 1
}

export async function POST(req: NextRequest) {
  await requireAdmin()

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [slug, order] = await Promise.all([
    generateUniqueSlug(parsed.data.title),
    getTopOrder(),
  ])

  const bundle = await db.track.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      icon: parsed.data.icon || null,
      order,
      priceIdr: parsed.data.isFree ? null : parsed.data.priceIdr ?? null,
      hasCertificate: parsed.data.hasCertificate,
      isFree: parsed.data.isFree,
      type: TrackType.BUNDLE,
      userId: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      icon: true,
      order: true,
      priceIdr: true,
      hasCertificate: true,
      isFree: true,
      publishedAt: true,
    },
  })

  return NextResponse.json({ bundle }, { status: 201 })
}
