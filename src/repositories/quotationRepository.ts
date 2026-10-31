import type { Prisma, QuotationStatus } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const personSelect = {
    select: { id: true, email: true, firstName: true, lastName: true },
} as const

export const quotationInclude = {
    customer: personSelect,
    createdBy: personSelect,
    updatedBy: personSelect,
    items: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
    booking: true,
    shares: {
        where: { revokedAt: null },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
    },
} satisfies Prisma.QuotationInclude

export type QuotationWithRelations = Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>

class QuotationRepository {
    async list(input: {
        q: string
        status: QuotationStatus | 'all'
        customerUserId?: string
        skip: number
        take: number
    }) {
        const where: Prisma.QuotationWhereInput = {
            deletedAt: null,
            ...(input.status !== 'all' ? { status: input.status } : {}),
            ...(input.customerUserId ? { customerUserId: input.customerUserId } : {}),
            ...(input.q
                ? {
                      OR: [
                          { number: { contains: input.q, mode: 'insensitive' } },
                          { title: { contains: input.q, mode: 'insensitive' } },
                          { customer: { email: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { firstName: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { lastName: { contains: input.q, mode: 'insensitive' } } },
                      ],
                  }
                : {}),
        }

        const [items, total] = await Promise.all([
            prisma.quotation.findMany({
                where,
                include: quotationInclude,
                orderBy: { createdAt: 'desc' },
                skip: input.skip,
                take: input.take,
            }),
            prisma.quotation.count({ where }),
        ])

        return { items, total }
    }

    async findById(id: string) {
        return prisma.quotation.findFirst({
            where: { id, deletedAt: null },
            include: quotationInclude,
        })
    }

    async nextNumber(year: number) {
        const prefix = `Q-${year}-`
        const latest = await prisma.quotation.findFirst({
            where: { number: { startsWith: prefix } },
            orderBy: { number: 'desc' },
            select: { number: true },
        })
        const next = latest ? Number(latest.number.slice(prefix.length)) + 1 : 1
        return `${prefix}${String(next).padStart(4, '0')}`
    }

    async create(data: {
        number: string
        customerUserId: string
        title: string
        currency: string
        notes: string | null
        customerMessage: string | null
        validUntil: Date | null
        subtotalCents: number
        optionalCents: number
        totalCents: number
        createdById: string
        items: Array<{
            kind: Prisma.QuotationItemCreateManyQuotationInput['kind']
            title: string
            description: string | null
            quantity: number
            unitCents: number
            lineCents: number
            isOptional: boolean
            selected: boolean
            sortOrder: number
        }>
    }) {
        return prisma.quotation.create({
            data: {
                number: data.number,
                customerUserId: data.customerUserId,
                title: data.title,
                currency: data.currency,
                notes: data.notes,
                customerMessage: data.customerMessage,
                validUntil: data.validUntil,
                subtotalCents: data.subtotalCents,
                optionalCents: data.optionalCents,
                totalCents: data.totalCents,
                createdById: data.createdById,
                updatedById: data.createdById,
                items: { create: data.items },
            },
            include: quotationInclude,
        })
    }

    async update(
        id: string,
        data: Prisma.QuotationUpdateInput & { items?: Prisma.QuotationItemCreateManyQuotationInput[] },
    ) {
        const { items, ...rest } = data
        return prisma.$transaction(async (tx) => {
            if (items) {
                await tx.quotationItem.deleteMany({ where: { quotationId: id } })
                await tx.quotationItem.createMany({
                    data: items.map((item) => ({ ...item, quotationId: id })),
                })
            }
            return tx.quotation.update({
                where: { id },
                data: rest,
                include: quotationInclude,
            })
        })
    }

    async softDelete(id: string, updatedById: string) {
        return prisma.quotation.update({
            where: { id },
            data: { deletedAt: new Date(), updatedById },
            include: quotationInclude,
        })
    }

    async createShare(data: {
        quotationId: string
        tokenHash: string
        createdById: string
        expiresAt: Date
        maxViews: number | null
    }) {
        return prisma.quotationShare.create({ data })
    }

    async listShares(quotationId: string) {
        return prisma.quotationShare.findMany({
            where: { quotationId },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: personSelect },
        })
    }

    async findShareById(id: string) {
        return prisma.quotationShare.findUnique({ where: { id } })
    }

    async findShareByTokenHash(tokenHash: string) {
        return prisma.quotationShare.findUnique({
            where: { tokenHash },
            include: {
                quotation: {
                    include: {
                        customer: personSelect,
                        items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
                    },
                },
            },
        })
    }

    async revokeShare(id: string) {
        return prisma.quotationShare.update({
            where: { id },
            data: { revokedAt: new Date() },
        })
    }

    async incrementShareViews(id: string) {
        return prisma.quotationShare.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        })
    }

    async createBooking(data: {
        customerUserId: string
        quotationId: string
        title: string
        currency: string
        totalCents: number
        notes: string | null
    }) {
        return prisma.booking.create({ data })
    }
}

export default new QuotationRepository()
