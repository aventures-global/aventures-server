import 'dotenv/config'

import { catalogCategories, catalogFaqs } from '../prisma/faqCatalog.ts'
import { prisma } from '../src/lib/prisma.js'

/**
 * Merges the FAQ catalog into the database: catalog entries are matched by question
 * (or a `replaces` text) and updated in place, missing ones are created, and absorbed
 * duplicates are removed. FAQs and categories created by admins are left untouched.
 */
async function syncFaqs() {
    const stats = { categoriesCreated: 0, created: 0, updated: 0, deleted: 0 }

    await prisma.$transaction(
        async (tx) => {
            const existingCategories = await tx.faqCategory.findMany({ orderBy: { sortOrder: 'asc' } })
            const categoryIds = new Map(existingCategories.map((c) => [c.name, c.id]))

            for (const name of catalogCategories) {
                if (categoryIds.has(name)) continue
                const created = await tx.faqCategory.create({ data: { name, sortOrder: 0 } })
                categoryIds.set(name, created.id)
                stats.categoriesCreated++
            }

            const extraCategories = existingCategories.filter((c) => !catalogCategories.includes(c.name))
            const orderedCategoryIds = [
                ...catalogCategories.map((name) => categoryIds.get(name)!),
                ...extraCategories.map((c) => c.id),
            ]
            for (const [sortOrder, id] of orderedCategoryIds.entries()) {
                await tx.faqCategory.update({ where: { id }, data: { sortOrder } })
            }

            const faqs = await tx.faq.findMany({ include: { categories: { select: { categoryId: true } } } })
            const byQuestion = new Map(faqs.map((f) => [f.question, f]))
            const queue = (await tx.faqTopEntry.findMany({ orderBy: { position: 'asc' } })).map((e) => e.faqId)
            const absorbedIds: string[] = []

            for (const item of catalogFaqs) {
                const matches = [item.question, ...(item.replaces ?? [])]
                    .map((q) => byQuestion.get(q))
                    .filter((f) => f !== undefined)
                const wantedCategoryIds = item.categories.map((name) => categoryIds.get(name)!)
                const [primary, ...absorbed] = matches

                if (!primary) {
                    await tx.faq.create({
                        data: {
                            question: item.question,
                            answer: item.answer,
                            categories: { create: wantedCategoryIds.map((categoryId) => ({ categoryId })) },
                        },
                    })
                    stats.created++
                    continue
                }

                const currentCategoryIds = primary.categories.map((c) => c.categoryId).sort()
                const categoriesChanged =
                    currentCategoryIds.join() !== [...wantedCategoryIds].sort().join()
                if (primary.question !== item.question || primary.answer !== item.answer || categoriesChanged) {
                    await tx.faq.update({
                        where: { id: primary.id },
                        data: {
                            question: item.question,
                            answer: item.answer,
                            ...(categoriesChanged && {
                                categories: {
                                    deleteMany: {},
                                    create: wantedCategoryIds.map((categoryId) => ({ categoryId })),
                                },
                            }),
                        },
                    })
                    stats.updated++
                }

                for (const faq of absorbed) {
                    const slot = queue.indexOf(faq.id)
                    if (slot !== -1) {
                        if (queue.includes(primary.id)) queue.splice(slot, 1)
                        else queue[slot] = primary.id
                    }
                    absorbedIds.push(faq.id)
                }
            }

            if (absorbedIds.length > 0) {
                await tx.faqTopEntry.deleteMany({})
                stats.deleted = (await tx.faq.deleteMany({ where: { id: { in: absorbedIds } } })).count
                await tx.faqTopEntry.createMany({ data: queue.map((faqId, position) => ({ faqId, position })) })
            }
        },
        { timeout: 120_000, maxWait: 20_000 },
    )

    console.log(
        `FAQ sync: ${stats.categoriesCreated} categories created, ${stats.created} FAQs created, ` +
            `${stats.updated} updated, ${stats.deleted} absorbed duplicates removed`,
    )
}

syncFaqs()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
