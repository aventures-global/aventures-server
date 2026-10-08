import 'dotenv/config'

import { seedPartners } from '../prisma/partnersSeed.ts'
import { prisma } from '../src/lib/prisma.js'

seedPartners(prisma)
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
