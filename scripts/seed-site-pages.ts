import 'dotenv/config'

import { seedSitePages } from '../prisma/sitePagesSeed.ts'
import { prisma } from '../src/lib/prisma.js'

/** Creates the SitePage table if missing, then seeds it. Safe to re-run. */
async function main() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SitePage" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "content" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
        )
    `)
    await seedSitePages(prisma)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
