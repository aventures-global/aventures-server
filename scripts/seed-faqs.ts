import 'dotenv/config'

import { seedFaqs } from '../prisma/faqSeed.ts'
import { prisma } from '../src/lib/prisma.js'

seedFaqs(prisma)
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
