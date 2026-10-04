import 'dotenv/config'

import {
    EXPERIENCE_CATEGORIES,
    STORY_COUNT,
    defaultExperienceBody,
    defaultTravelTips,
} from '../../client/src/data/destinationContent.ts'
import { prisma } from '../src/lib/prisma.js'

/**
 * One-off: fills experiences, storyTitles, and travelTips from the legacy
 * highlights/gallery columns, matching what the public page rendered before.
 * Run before `prisma db push`, which drops the legacy columns.
 */
type LegacyTour = {
    id: string
    location: string
    tagline: string
    coverImage: string
    gallery: string[]
    highlights: string[]
}

async function main() {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tour"
            ADD COLUMN IF NOT EXISTS "experiences" JSONB NOT NULL DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS "storyTitles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            ADD COLUMN IF NOT EXISTS "travelTips" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `)

    const legacy = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM information_schema.columns
        WHERE table_name = 'Tour' AND column_name IN ('gallery', 'highlights')
    `
    if (Number(legacy[0]?.count ?? 0) < 2) {
        console.log('Legacy columns already removed, nothing to backfill')
        return
    }

    const tours = await prisma.$queryRaw<LegacyTour[]>`
        SELECT id, location, tagline, "coverImage", gallery, highlights FROM "Tour"
        WHERE experiences = '[]'::jsonb
    `

    for (const tour of tours) {
        const images = tour.gallery.length ? tour.gallery : [tour.coverImage]
        const highlights = tour.highlights.length ? tour.highlights : [tour.tagline]
        const experiences = EXPERIENCE_CATEGORIES.map((category, index) => ({
            headline: highlights[index % highlights.length],
            summary: category.summary,
            body: defaultExperienceBody(tour.location),
            image: images[index % images.length],
        }))
        const storyTitles = Array.from(
            { length: STORY_COUNT },
            (_, index) => highlights[index % highlights.length],
        )

        await prisma.$executeRaw`
            UPDATE "Tour"
            SET experiences = ${JSON.stringify(experiences)}::jsonb,
                "storyTitles" = ${storyTitles},
                "travelTips" = ${defaultTravelTips(tour.location)}
            WHERE id = ${tour.id}
        `
    }

    console.log(`Backfilled ${tours.length} tours`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
