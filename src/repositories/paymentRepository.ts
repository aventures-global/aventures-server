import type { PaymentMethod, Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const personSelect = {
    select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true },
} as const

export const paymentInclude = {
    customer: personSelect,
    createdBy: personSelect,
    voidedBy: personSelect,
    booking: {
        include: {
            quotation: { select: { id: true, number: true, title: true } },
            customer: personSelect,
        },
    },
    financeEntry: { select: { id: true, voidedAt: true } },
} satisfies Prisma.PaymentInclude

export type PaymentWithRelations = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>

class PaymentRepository {
    async list(input: {
        q: string
        customerUserId?: string
        bookingId?: string
        method: PaymentMethod | 'all'
        from?: Date
        to?: Date
        includeVoided: boolean
        skip: number
        take: number
    }) {
        const where: Prisma.PaymentWhereInput = {
            ...(input.includeVoided ? {} : { voidedAt: null }),
            ...(input.customerUserId ? { customerUserId: input.customerUserId } : {}),
            ...(input.bookingId ? { bookingId: input.bookingId } : {}),
            ...(input.method !== 'all' ? { method: input.method } : {}),
            ...(input.from || input.to
                ? {
                      paidAt: {
                          ...(input.from ? { gte: input.from } : {}),
                          ...(input.to ? { lte: input.to } : {}),
                      },
                  }
                : {}),
            ...(input.q
                ? {
                      OR: [
                          { notes: { contains: input.q, mode: 'insensitive' } },
                          { reference: { contains: input.q, mode: 'insensitive' } },
                          { booking: { title: { contains: input.q, mode: 'insensitive' } } },
                          { booking: { quotation: { number: { contains: input.q, mode: 'insensitive' } } } },
                          { customer: { email: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { firstName: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { lastName: { contains: input.q, mode: 'insensitive' } } },
                      ],
                  }
                : {}),
        }

        const [items, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: paymentInclude,
                orderBy: { paidAt: 'desc' },
                skip: input.skip,
                take: input.take,
            }),
            prisma.payment.count({ where }),
        ])

        return { items, total }
    }

    async listForExport(input: {
        q: string
        customerUserId?: string
        bookingId?: string
        method: PaymentMethod | 'all'
        from?: Date
        to?: Date
        includeVoided: boolean
    }) {
        const where: Prisma.PaymentWhereInput = {
            ...(input.includeVoided ? {} : { voidedAt: null }),
            ...(input.customerUserId ? { customerUserId: input.customerUserId } : {}),
            ...(input.bookingId ? { bookingId: input.bookingId } : {}),
            ...(input.method !== 'all' ? { method: input.method } : {}),
            ...(input.from || input.to
                ? {
                      paidAt: {
                          ...(input.from ? { gte: input.from } : {}),
                          ...(input.to ? { lte: input.to } : {}),
                      },
                  }
                : {}),
            ...(input.q
                ? {
                      OR: [
                          { notes: { contains: input.q, mode: 'insensitive' } },
                          { reference: { contains: input.q, mode: 'insensitive' } },
                          { booking: { title: { contains: input.q, mode: 'insensitive' } } },
                          { booking: { quotation: { number: { contains: input.q, mode: 'insensitive' } } } },
                          { customer: { email: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { firstName: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { lastName: { contains: input.q, mode: 'insensitive' } } },
                      ],
                  }
                : {}),
        }

        return prisma.payment.findMany({
            where,
            include: paymentInclude,
            orderBy: { paidAt: 'desc' },
            take: 5000,
        })
    }

    async findById(id: string) {
        return prisma.payment.findUnique({
            where: { id },
            include: paymentInclude,
        })
    }

    async create(data: Prisma.PaymentCreateInput) {
        return prisma.payment.create({
            data,
            include: paymentInclude,
        })
    }

    async update(id: string, data: Prisma.PaymentUpdateInput) {
        return prisma.payment.update({
            where: { id },
            data,
            include: paymentInclude,
        })
    }

    async summary(from?: Date, to?: Date) {
        const where: Prisma.PaymentWhereInput = {
            voidedAt: null,
            ...(from || to
                ? {
                      paidAt: {
                          ...(from ? { gte: from } : {}),
                          ...(to ? { lte: to } : {}),
                      },
                  }
                : {}),
        }

        const [aggregate, byMethod] = await Promise.all([
            prisma.payment.aggregate({
                where,
                _sum: { amountCents: true },
                _count: { _all: true },
            }),
            prisma.payment.groupBy({
                by: ['method'],
                where,
                _sum: { amountCents: true },
                _count: { _all: true },
            }),
        ])

        return { aggregate, byMethod }
    }
}

export default new PaymentRepository()
