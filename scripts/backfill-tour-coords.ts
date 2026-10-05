import 'dotenv/config'

import { prisma } from '../src/lib/prisma.js'
import { resolveTourCoords } from '../src/lib/tourCoords.js'

/**
 * Fills Tour.lat/lng from each tour's location so "closest destination" suggestions
 * can measure distance. Pass --all to recompute tours that already have coordinates.
 */
async function main() {
    const all = process.argv.includes('--all')
    const tours = await prisma.tour.findMany({
        where: all ? {} : { OR: [{ lat: null }, { lng: null }] },
        select: { id: true, location: true },
    })

    let filled = 0
    for (const tour of tours) {
        const coords = await resolveTourCoords(tour.location)
        if (!coords) {
            console.warn(`No coordinates for ${tour.id} (${tour.location})`)
            continue
        }
        await prisma.$executeRaw`UPDATE "Tour" SET "lat" = ${coords.lat}, "lng" = ${coords.lng} WHERE "id" = ${tour.id}`
        console.log(`${tour.id}: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`)
        filled++
    }

    console.log(`Filled coordinates for ${filled} of ${tours.length} tours`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
