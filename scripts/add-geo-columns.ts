import 'dotenv/config'

import { prisma } from '../src/lib/prisma.js'

/** Adds Tour.lat/lng and the GeocodeCache table if missing. Safe to re-run. */
async function main() {
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Tour"
            ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION
    `)
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GeocodeCache" (
            "query" TEXT NOT NULL PRIMARY KEY,
            "lat" DOUBLE PRECISION,
            "lng" DOUBLE PRECISION,
            "label" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "GeocodeCache"
            ADD COLUMN IF NOT EXISTS "country" TEXT,
            ADD COLUMN IF NOT EXISTS "placeType" TEXT
    `)
    // Hits cached before the country columns existed would never match a country; refetch them.
    await prisma.$executeRawUnsafe(`
        DELETE FROM "GeocodeCache" WHERE "lat" IS NOT NULL AND "country" IS NULL
    `)
    console.log('Geo columns ready')
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
