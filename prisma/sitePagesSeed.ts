import { defaultSitePages } from '../../client/src/data/sitePages.ts'
import type { PrismaClient } from '../src/generated/prisma/client.js'
import { SITE_PAGE_IDS } from '../src/lib/sitePageContent.js'

/** Creates missing site pages only, so admin edits are never overwritten. */
export async function seedSitePages(prisma: PrismaClient) {
    let created = 0
    for (const id of SITE_PAGE_IDS) {
        const existing = await prisma.sitePage.findUnique({ where: { id }, select: { id: true } })
        if (existing) continue
        await prisma.sitePage.create({ data: { id, content: defaultSitePages[id] } })
        created += 1
    }
    console.log(`Seeded site pages: ${created} created, ${SITE_PAGE_IDS.length - created} already present`)
}
