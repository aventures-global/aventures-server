import type { PrismaClient } from '../src/generated/prisma/client.js'

import { partners } from '../../client/src/data/partners.ts'

/** Logos are only set on create so re-seeding never replaces one uploaded in the CMS. */
export async function seedPartners(
    prisma: PrismaClient,
    resolveLogo: (src: string) => Promise<string> = async (src) => src,
) {
    for (const [index, partner] of partners.entries()) {
        const details = {
            name: partner.name,
            url: partner.url,
            description: partner.description,
            sortOrder: index,
        }
        await prisma.partner.upsert({
            where: { id: partner.id },
            create: {
                id: partner.id,
                ...details,
                logoSrc: partner.logoSrc ? await resolveLogo(partner.logoSrc) : '',
            },
            update: details,
        })
    }
    console.log(`Seeded ${partners.length} partners`)
}
