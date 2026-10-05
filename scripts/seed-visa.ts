import 'dotenv/config'

import { seedVisaCatalog } from '../prisma/visaSeed.ts'
import { prisma } from '../src/lib/prisma.js'

/** Creates the VisaCatalog table if missing, then seeds it. Safe to re-run. */
async function main() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "VisaCatalog" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "pages" JSONB NOT NULL,
            "services" JSONB NOT NULL,
            "finder" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
        )
    `)
    await seedVisaCatalog(prisma)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
