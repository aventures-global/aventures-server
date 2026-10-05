import 'dotenv/config'

import { toTourDto } from '../src/lib/mappers.js'
import { prisma } from '../src/lib/prisma.js'
import { buildTourSearchText } from '../src/lib/tourSearchText.js'

/**
 * Adds the searchText column if missing and fills it for every tour from the
 * fields the public search matches. Safe to re-run.
 */
async function main() {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "searchText" TEXT NOT NULL DEFAULT ''
    `)

    const tours = await prisma.tour.findMany()

    await prisma.$transaction(
        tours.map((tour) =>
            prisma.tour.update({
                where: { id: tour.id },
                data: { searchText: buildTourSearchText(toTourDto(tour)) },
            }),
        ),
    )

    console.log(`Backfilled search text for ${tours.length} tours`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
