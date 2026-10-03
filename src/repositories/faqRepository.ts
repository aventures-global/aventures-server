import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const faqInclude = {
    categories: { select: { categoryId: true } },
} satisfies Prisma.FaqInclude

export type FaqWithCategories = Prisma.FaqGetPayload<{ include: typeof faqInclude }>

class FaqRepository {
    async findAllCategories() {
        return prisma.faqCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    }

    async findCategoryById(id: string) {
        return prisma.faqCategory.findUnique({ where: { id } })
    }

    async countCategoriesByIds(ids: string[]) {
        return prisma.faqCategory.count({ where: { id: { in: ids } } })
    }

    async createCategory(name: string) {
        const last = await prisma.faqCategory.findFirst({ orderBy: { sortOrder: 'desc' } })
        return prisma.faqCategory.create({ data: { name, sortOrder: (last?.sortOrder ?? -1) + 1 } })
    }

    async updateCategory(id: string, name: string) {
        return prisma.faqCategory.update({ where: { id }, data: { name } })
    }

    async deleteCategory(id: string) {
        return prisma.faqCategory.delete({ where: { id } })
    }

    async reorderCategories(ids: string[]) {
        return prisma.$transaction(
            ids.map((id, index) =>
                prisma.faqCategory.update({ where: { id }, data: { sortOrder: index } }),
            ),
        )
    }

    async findAllFaqs() {
        return prisma.faq.findMany({ include: faqInclude, orderBy: { question: 'asc' } })
    }

    async findFaqById(id: string) {
        return prisma.faq.findUnique({ where: { id }, include: faqInclude })
    }

    async createFaq(data: { question: string; answer: string; categoryIds: string[] }) {
        return prisma.faq.create({
            data: {
                question: data.question,
                answer: data.answer,
                categories: { create: data.categoryIds.map((categoryId) => ({ categoryId })) },
            },
            include: faqInclude,
        })
    }

    async updateFaq(
        id: string,
        data: { question?: string; answer?: string; categoryIds?: string[] },
    ) {
        return prisma.faq.update({
            where: { id },
            data: {
                ...(data.question !== undefined ? { question: data.question } : {}),
                ...(data.answer !== undefined ? { answer: data.answer } : {}),
                ...(data.categoryIds !== undefined
                    ? {
                          categories: {
                              deleteMany: {},
                              create: data.categoryIds.map((categoryId) => ({ categoryId })),
                          },
                      }
                    : {}),
            },
            include: faqInclude,
        })
    }

    async deleteFaq(id: string) {
        return prisma.$transaction(async (tx) => {
            await tx.faq.delete({ where: { id } })
            await compactTopQueue(tx)
        })
    }

    async findTopEntries() {
        return prisma.faqTopEntry.findMany({ orderBy: { position: 'asc' } })
    }

    /**
     * Appends `faqId` to the end of the queue. An FAQ already queued moves to the end;
     * otherwise the first entries are dropped so the queue never exceeds `limit`.
     */
    async enqueueTop(faqId: string, limit: number) {
        return prisma.$transaction(async (tx) => {
            const entries = await tx.faqTopEntry.findMany({ orderBy: { position: 'asc' } })
            const ids = entries.map((entry) => entry.faqId).filter((id) => id !== faqId)
            ids.push(faqId)
            const kept = ids.slice(Math.max(0, ids.length - limit))

            await tx.faqTopEntry.deleteMany({})
            await tx.faqTopEntry.createMany({
                data: kept.map((id, position) => ({ faqId: id, position })),
            })
        })
    }

    async removeTop(faqId: string) {
        return prisma.$transaction(async (tx) => {
            await tx.faqTopEntry.deleteMany({ where: { faqId } })
            await compactTopQueue(tx)
        })
    }
}

async function compactTopQueue(tx: Prisma.TransactionClient) {
    const entries = await tx.faqTopEntry.findMany({ orderBy: { position: 'asc' } })
    for (const [position, entry] of entries.entries()) {
        if (entry.position !== position) {
            await tx.faqTopEntry.update({ where: { faqId: entry.faqId }, data: { position } })
        }
    }
}

export default new FaqRepository()
