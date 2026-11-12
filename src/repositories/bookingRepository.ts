import type { BookingPaymentStatus, Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const personSelect = {
    select: { id: true, email: true, firstName: true, lastName: true, profilePicture: true },
} as const

const quotationSelect = {
    select: {
        id: true,
        number: true,
        title: true,
        status: true,
        customerName: true,
        customerEmail: true,
    },
} as const

export const bookingInclude = {
    customer: personSelect,
    quotation: quotationSelect,
    payments: {
        orderBy: { paidAt: 'desc' as const },
        include: {
            createdBy: personSelect,
            voidedBy: personSelect,
        },
    },
} satisfies Prisma.BookingInclude

export const bookingListInclude = {
    customer: personSelect,
    quotation: quotationSelect,
} satisfies Prisma.BookingInclude

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>
export type BookingListItem = Prisma.BookingGetPayload<{ include: typeof bookingListInclude }>

class BookingRepository {
    async list(input: {
        q: string
        customerUserId?: string
        paymentStatus: BookingPaymentStatus | 'open' | 'all'
        skip: number
        take: number
    }) {
        const where: Prisma.BookingWhereInput = {
            ...(input.paymentStatus === 'open'
                ? { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } }
                : input.paymentStatus !== 'all'
                  ? { paymentStatus: input.paymentStatus }
                  : {}),
            ...(input.customerUserId ? { customerUserId: input.customerUserId } : {}),
            ...(input.q
                ? {
                      OR: [
                          { title: { contains: input.q, mode: 'insensitive' } },
                          { quotation: { number: { contains: input.q, mode: 'insensitive' } } },
                          { quotation: { customerName: { contains: input.q, mode: 'insensitive' } } },
                          { quotation: { customerEmail: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { email: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { firstName: { contains: input.q, mode: 'insensitive' } } },
                          { customer: { lastName: { contains: input.q, mode: 'insensitive' } } },
                      ],
                  }
                : {}),
        }

        const [items, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: bookingListInclude,
                orderBy: { createdAt: 'desc' },
                skip: input.skip,
                take: input.take,
            }),
            prisma.booking.count({ where }),
        ])

        return { items, total }
    }

    async findById(id: string) {
        return prisma.booking.findUnique({
            where: { id },
            include: bookingInclude,
        })
    }

    async update(
        id: string,
        data: Prisma.BookingUpdateInput,
    ) {
        return prisma.booking.update({
            where: { id },
            data,
            include: bookingInclude,
        })
    }

    async updatePaymentState(
        id: string,
        data: { paidCents: number; paymentStatus: BookingPaymentStatus },
    ) {
        return prisma.booking.update({
            where: { id },
            data,
        })
    }

    async sumActivePayments(bookingId: string) {
        const result = await prisma.payment.aggregate({
            where: { bookingId, voidedAt: null },
            _sum: { amountCents: true },
        })
        return result._sum.amountCents ?? 0
    }

    async countByPaymentStatus() {
        const rows = await prisma.booking.groupBy({
            by: ['paymentStatus'],
            _count: { _all: true },
        })
        return rows
    }

    async countOverdue() {
        return prisma.booking.count({
            where: {
                dueAt: { lt: new Date() },
                paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
            },
        })
    }

    async outstandingCents() {
        const rows = await prisma.booking.findMany({
            where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
            select: { totalCents: true, paidCents: true },
        })
        return rows.reduce((sum, row) => sum + Math.max(0, row.totalCents - row.paidCents), 0)
    }
}

export default new BookingRepository()
