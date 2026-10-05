import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'
import { VISA_CATALOG_ID, type VisaCatalogContent } from '../lib/visaContent.js'

function toJson(value: unknown) {
    return value as Prisma.InputJsonValue
}

class VisaRepository {
    async find(): Promise<VisaCatalogContent | null> {
        const row = await prisma.visaCatalog.findUnique({ where: { id: VISA_CATALOG_ID } })
        if (!row) return null
        return {
            pages: row.pages as unknown as VisaCatalogContent['pages'],
            services: row.services as unknown as VisaCatalogContent['services'],
            finder: row.finder as unknown as VisaCatalogContent['finder'],
        }
    }

    async update(data: Partial<VisaCatalogContent>) {
        await prisma.visaCatalog.update({
            where: { id: VISA_CATALOG_ID },
            data: {
                ...(data.pages ? { pages: toJson(data.pages) } : {}),
                ...(data.services ? { services: toJson(data.services) } : {}),
                ...(data.finder ? { finder: toJson(data.finder) } : {}),
            },
        })
    }
}

export default new VisaRepository()
