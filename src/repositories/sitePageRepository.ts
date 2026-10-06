import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'
import type { SitePageId } from '../lib/sitePageContent.js'

class SitePageRepository {
    async findById(id: SitePageId) {
        return prisma.sitePage.findUnique({ where: { id } })
    }

    async updateContent(id: SitePageId, content: unknown) {
        return prisma.sitePage.update({
            where: { id },
            data: { content: content as Prisma.InputJsonValue },
        })
    }
}

export default new SitePageRepository()
