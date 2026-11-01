import type { FinanceEntryType, Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const personSelect = {
    select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true },
} as const

export const financeEntryInclude = {
    category: true,
    createdBy: personSelect,
    voidedBy: personSelect,
    payment: {
        select: {
            id: true,
            bookingId: true,
            customerUserId: true,
            amountCents: true,
            voidedAt: true,
        },
    },
} satisfies Prisma.FinanceEntryInclude

export type FinanceEntryWithRelations = Prisma.FinanceEntryGetPayload<{
    include: typeof financeEntryInclude
}>

class FinanceRepository {
    async listCategories(includeArchived = false) {
        return prisma.financeCategory.findMany({
            where: includeArchived ? undefined : { archivedAt: null },
            orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        })
    }

    async findCategoryById(id: string) {
        return prisma.financeCategory.findUnique({ where: { id } })
    }

    async findSystemIncomeCategory() {
        return prisma.financeCategory.findFirst({
            where: { type: 'INCOME', isSystem: true, name: 'Customer payments', archivedAt: null },
        })
    }

    async createCategory(data: Prisma.FinanceCategoryCreateInput) {
        return prisma.financeCategory.create({ data })
    }

    async updateCategory(id: string, data: Prisma.FinanceCategoryUpdateInput) {
        return prisma.financeCategory.update({ where: { id }, data })
    }

    async listEntries(input: {
        q: string
        type: FinanceEntryType | 'all'
        categoryId?: string
        currency?: string
        from?: Date
        to?: Date
        includeVoided: boolean
        skip: number
        take: number
    }) {
        const where: Prisma.FinanceEntryWhereInput = {
            ...(input.includeVoided ? {} : { voidedAt: null }),
            ...(input.type !== 'all' ? { type: input.type } : {}),
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
            ...(input.currency ? { currency: input.currency } : {}),
            ...(input.from || input.to
                ? {
                      occurredAt: {
                          ...(input.from ? { gte: input.from } : {}),
                          ...(input.to ? { lte: input.to } : {}),
                      },
                  }
                : {}),
            ...(input.q
                ? {
                      OR: [
                          { description: { contains: input.q, mode: 'insensitive' } },
                          { notes: { contains: input.q, mode: 'insensitive' } },
                          { category: { name: { contains: input.q, mode: 'insensitive' } } },
                      ],
                  }
                : {}),
        }

        const [items, total] = await Promise.all([
            prisma.financeEntry.findMany({
                where,
                include: financeEntryInclude,
                orderBy: { occurredAt: 'desc' },
                skip: input.skip,
                take: input.take,
            }),
            prisma.financeEntry.count({ where }),
        ])

        return { items, total }
    }

    async findEntryById(id: string) {
        return prisma.financeEntry.findUnique({
            where: { id },
            include: financeEntryInclude,
        })
    }

    async findEntryByPaymentId(paymentId: string) {
        return prisma.financeEntry.findUnique({
            where: { paymentId },
            include: financeEntryInclude,
        })
    }

    async createEntry(data: Prisma.FinanceEntryCreateInput) {
        return prisma.financeEntry.create({
            data,
            include: financeEntryInclude,
        })
    }

    async updateEntry(id: string, data: Prisma.FinanceEntryUpdateInput) {
        return prisma.financeEntry.update({
            where: { id },
            data,
            include: financeEntryInclude,
        })
    }

    async summary(input: { from?: Date; to?: Date; currency?: string }) {
        const where: Prisma.FinanceEntryWhereInput = {
            voidedAt: null,
            ...(input.currency ? { currency: input.currency } : {}),
            ...(input.from || input.to
                ? {
                      occurredAt: {
                          ...(input.from ? { gte: input.from } : {}),
                          ...(input.to ? { lte: input.to } : {}),
                      },
                  }
                : {}),
        }

        const [byType, byCategory] = await Promise.all([
            prisma.financeEntry.groupBy({
                by: ['type'],
                where,
                _sum: { amountCents: true },
                _count: { _all: true },
            }),
            prisma.financeEntry.groupBy({
                by: ['categoryId', 'type'],
                where,
                _sum: { amountCents: true },
                _count: { _all: true },
            }),
        ])

        const categories = await prisma.financeCategory.findMany({
            where: { id: { in: byCategory.map((row) => row.categoryId) } },
        })
        const categoryMap = new Map(categories.map((c) => [c.id, c]))

        return { byType, byCategory, categoryMap }
    }
}

export default new FinanceRepository()
