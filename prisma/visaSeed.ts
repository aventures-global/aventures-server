import { buildVisaCatalog } from '../../client/src/data/visaCatalog.ts'
import type { PrismaClient } from '../src/generated/prisma/client.js'
import { VISA_CATALOG_ID } from '../src/lib/visaContent.js'

function sameText(a: string, b: string) {
    return a.normalize('NFC').trim().toLowerCase() === b.normalize('NFC').trim().toLowerCase()
}

/** Seeds the visa catalog only when it is missing, so admin edits are never overwritten. */
export async function seedVisaCatalog(prisma: PrismaClient) {
    const existing = await prisma.visaCatalog.findUnique({ where: { id: VISA_CATALOG_ID } })
    if (existing) {
        console.log('Skipped visa catalog seed: catalog already exists')
        return
    }

    const catalog = buildVisaCatalog()
    const categories = await prisma.faqCategory.findMany({
        include: { faqs: { include: { faq: { select: { id: true, question: true } } } } },
    })

    const services = catalog.services.map((service) => {
        const category = categories.find((c) => sameText(c.name, service.faqCategory))
        const faqs = category?.faqs.map((link) => link.faq) ?? []
        const find = (question: string) =>
            question ? (faqs.find((faq) => sameText(faq.question, question))?.id ?? null) : null
        return {
            ...service,
            faqCategoryId: category?.id ?? null,
            introFaqId: find(service.introQuestion),
            qualifyFaqId: find(service.qualifyQuestion),
        }
    })

    await prisma.visaCatalog.create({
        data: { id: VISA_CATALOG_ID, pages: catalog.pages, services, finder: catalog.finder },
    })

    const linked = services.filter((service) => service.faqCategoryId).length
    console.log(`Seeded visa catalog: ${catalog.pages.length} pages, ${services.length} services (${linked} linked to FAQs)`)
}
