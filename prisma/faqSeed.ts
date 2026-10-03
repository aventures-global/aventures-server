import type { PrismaClient } from '../src/generated/prisma/client.js'

import { catalogCategories, catalogFaqs, defaultTopQuestions } from './faqCatalog.ts'

/** Seeds starter FAQs only into an empty catalog, so admin edits are never overwritten. */
export async function seedFaqs(prisma: PrismaClient) {
    const existing = await prisma.faq.count()
    if (existing > 0) {
        console.log(`Skipped FAQ seed: ${existing} FAQs already exist`)
        return
    }

    const categoryIds = new Map<string, string>()
    for (const [sortOrder, name] of catalogCategories.entries()) {
        const category = await prisma.faqCategory.create({ data: { name, sortOrder } })
        categoryIds.set(name, category.id)
    }

    const faqIds = new Map<string, string>()
    for (const item of catalogFaqs) {
        const faq = await prisma.faq.create({
            data: {
                question: item.question,
                answer: item.answer,
                categories: {
                    create: item.categories.map((name) => ({ categoryId: categoryIds.get(name)! })),
                },
            },
        })
        faqIds.set(item.question, faq.id)
    }

    await prisma.faqTopEntry.createMany({
        data: defaultTopQuestions.map((question, position) => ({ faqId: faqIds.get(question)!, position })),
    })

    console.log(`Seeded ${catalogCategories.length} FAQ categories and ${catalogFaqs.length} FAQs`)
}
