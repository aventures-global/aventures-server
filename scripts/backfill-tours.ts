import 'dotenv/config'

import { prisma } from '../src/lib/prisma.js'
import { guessRegion } from '../src/lib/tourRegion.js'

/**
 * One-off: sets region from location and numbers sortOrder 1..n in the
 * previous public order (featured first, then A to Z).
 */
async function main() {
    const tours = await prisma.tour.findMany({
        orderBy: [{ featured: 'desc' }, { title: 'asc' }],
        select: { id: true, location: true },
    })

    await prisma.$transaction(
        tours.map((tour, index) =>
            prisma.tour.update({
                where: { id: tour.id },
                data: { region: guessRegion(tour.location), sortOrder: index + 1 },
            }),
        ),
    )

    console.log(`Backfilled ${tours.length} tours`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
