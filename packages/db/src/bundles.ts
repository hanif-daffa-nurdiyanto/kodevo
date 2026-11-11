import { db } from "./client"
import { TrackType, type PrismaClient } from "./generated/prisma/client"

export type BundleTrackSeed = {
  slug: string
  title: string
  description: string
  icon: string
  priceIdr: number
  hasCertificate: boolean
  order: number
}

type BundleTrackClient = Pick<PrismaClient, "track">

export const DEFAULT_BUNDLE_TRACKS: BundleTrackSeed[] = [
  {
    slug: "fullstack-developer",
    title: "Fullstack Developer",
    description: "Bundle kurasi untuk membangun skill frontend, backend, database, deployment, dan project fullstack end-to-end.",
    icon: "💻",
    priceIdr: 299000,
    hasCertificate: true,
    order: 10,
  },
  {
    slug: "claude-code",
    title: "Claude Code",
    description: "Bundle kurasi untuk memakai Claude Code dan AI-assisted development secara praktis dalam workflow engineering.",
    icon: "✨",
    priceIdr: 199000,
    hasCertificate: true,
    order: 20,
  },
]

export async function seedDefaultBundleTracks(
  client: BundleTrackClient = db,
  bundles: BundleTrackSeed[] = DEFAULT_BUNDLE_TRACKS
): Promise<Array<{ slug: string; id: string }>> {
  const tracks = []

  for (const bundle of bundles) {
    const track = await client.track.upsert({
      where: { slug: bundle.slug },
      update: {
        title: bundle.title,
        description: bundle.description,
        icon: bundle.icon,
        order: bundle.order,
        type: TrackType.BUNDLE,
        priceIdr: bundle.priceIdr,
        hasCertificate: bundle.hasCertificate,
        publishedAt: new Date(),
        userId: null,
      },
      create: {
        title: bundle.title,
        description: bundle.description,
        slug: bundle.slug,
        icon: bundle.icon,
        order: bundle.order,
        isFree: false,
        type: TrackType.BUNDLE,
        priceIdr: bundle.priceIdr,
        hasCertificate: bundle.hasCertificate,
        publishedAt: new Date(),
        userId: null,
      },
      select: { id: true, slug: true },
    })

    tracks.push(track)
  }

  return tracks
}
