import type { BookingPaymentStatus, PaymentMethod, User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { formatMoney } from '../lib/money.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import BookingRepository from '../repositories/bookingRepository.js'
import FinanceRepository from '../repositories/financeRepository.js'
import PaymentRepository, { type PaymentWithRelations } from '../repositories/paymentRepository.js'
import {
    paymentCreateSchema,
    paymentListSchema,
    paymentSummarySchema,
    paymentUpdateSchema,
    paymentVoidSchema,
} from '../schemas/index.js'
import { computePaymentStatus, isBookingOverdue } from './bookingService.js'

type Actor = Pick<User, 'id' | 'role'>

export type RecordPaymentInput = {
    bookingId: string
    amountCents: number
    method: PaymentMethod
    paidAt?: Date
    notes?: string | null
    reference?: string | null
    stripeCheckoutSessionId?: string | null
    stripePaymentIntentId?: string | null
    /** When set, used as Payment.createdBy and finance entry creator. */
    createdById?: string | null
    /** Audit actor; defaults to createdById, then customer. */
    actorId?: string | null
}

function displayName(user: { firstName: string | null; lastName: string | null; email: string | null }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return name || user.email || 'Customer'
}

function serializePerson(
    person: { id: string; email: string | null; firstName: string | null; lastName: string | null; profilePicture: string | null } | null,
) {
    if (!person) return null
    return {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        profilePicture: person.profilePicture,
        displayName: displayName(person),
    }
}

function serializePayment(payment: PaymentWithRelations) {
    const booking = payment.booking
    const remainingCents = Math.max(0, booking.totalCents - booking.paidCents)
    return {
        id: payment.id,
        bookingId: payment.bookingId,
        customerUserId: payment.customerUserId,
        customer: serializePerson(payment.customer),
        amountCents: payment.amountCents,
        amount: formatMoney(payment.amountCents, payment.currency),
        currency: payment.currency,
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes,
        reference: payment.reference,
        voidedAt: payment.voidedAt?.toISOString() ?? null,
        voidReason: payment.voidReason,
        voidedBy: serializePerson(payment.voidedBy),
        createdBy: serializePerson(payment.createdBy),
        financeEntryId: payment.financeEntry?.id ?? null,
        booking: {
            id: booking.id,
            title: booking.title,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            isOverdue: isBookingOverdue(booking),
            totalCents: booking.totalCents,
            total: formatMoney(booking.totalCents, booking.currency),
            paidCents: booking.paidCents,
            paid: formatMoney(booking.paidCents, booking.currency),
            remainingCents,
            remaining: formatMoney(remainingCents, booking.currency),
            currency: booking.currency,
            dueAt: booking.dueAt?.toISOString() ?? null,
            quotation: booking.quotation
                ? {
                      id: booking.quotation.id,
                      number: booking.quotation.number,
                      title: booking.quotation.title,
                      customerName: booking.quotation.customerName,
                      customerEmail: booking.quotation.customerEmail,
                  }
                : null,
            customer: serializePerson(booking.customer),
        },
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
    }
}

async function recomputeBookingPaymentState(bookingId: string) {
    const booking = await BookingRepository.findById(bookingId)
    if (!booking) return null
    const paidCents = await BookingRepository.sumActivePayments(bookingId)
    const paymentStatus: BookingPaymentStatus = computePaymentStatus(booking.totalCents, paidCents)
    await BookingRepository.updatePaymentState(bookingId, { paidCents, paymentStatus })
    return { paidCents, paymentStatus }
}

function csvEscape(value: string) {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
}

class PaymentService {
    async list(query: z.infer<typeof paymentListSchema>) {
        const skip = (query.page - 1) * query.limit
        const { items, total } = await PaymentRepository.list({
            q: query.q,
            customerUserId: query.customerUserId,
            bookingId: query.bookingId,
            method: query.method,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            includeVoided: query.includeVoided ?? false,
            skip,
            take: query.limit,
        })
        return {
            items: items.map(serializePayment),
            total,
            page: query.page,
            limit: query.limit,
        }
    }

    async get(id: string) {
        const payment = await PaymentRepository.findById(id)
        if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found')
        return serializePayment(payment)
    }

    async recordPayment(input: RecordPaymentInput) {
        if (input.stripeCheckoutSessionId) {
            const existing = await PaymentRepository.findByStripeCheckoutSessionId(input.stripeCheckoutSessionId)
            if (existing) return serializePayment(existing)
        }

        const booking = await BookingRepository.findById(input.bookingId)
        if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found')
        if (booking.status === 'CANCELLED') {
            throw new AppError(400, 'BOOKING_CANCELLED', 'Cannot record payments on a cancelled booking')
        }

        const createdById = input.createdById ?? null
        const actorId = input.actorId ?? createdById ?? booking.customerUserId ?? null

        try {
            const payment = await PaymentRepository.create({
                booking: { connect: { id: booking.id } },
                ...(booking.customerUserId
                    ? { customer: { connect: { id: booking.customerUserId } } }
                    : {}),
                amountCents: input.amountCents,
                currency: booking.currency,
                method: input.method,
                paidAt: input.paidAt ?? new Date(),
                notes: input.notes ?? null,
                reference: input.reference ?? null,
                stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
                stripePaymentIntentId: input.stripePaymentIntentId ?? null,
                ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
            })

            await recomputeBookingPaymentState(booking.id)

            const category = await FinanceRepository.findSystemIncomeCategory()
            if (category) {
                await FinanceRepository.createEntry({
                    type: 'INCOME',
                    category: { connect: { id: category.id } },
                    amountCents: payment.amountCents,
                    currency: payment.currency,
                    occurredAt: payment.paidAt,
                    description: `Payment for ${booking.title}`,
                    notes: payment.reference ? `Ref: ${payment.reference}` : payment.notes,
                    payment: { connect: { id: payment.id } },
                    ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
                })
            }

            await AuditLogRepository.create({
                actorId,
                subjectUserId: booking.customerUserId,
                action: 'payment.created',
                metadata: {
                    paymentId: payment.id,
                    bookingId: booking.id,
                    amountCents: payment.amountCents,
                    method: payment.method,
                    stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
                },
            })

            const refreshed = await PaymentRepository.findById(payment.id)
            return serializePayment(refreshed!)
        } catch (err) {
            // Concurrent webhook retries: unique session id means another writer won.
            if (input.stripeCheckoutSessionId) {
                const raced = await PaymentRepository.findByStripeCheckoutSessionId(input.stripeCheckoutSessionId)
                if (raced) return serializePayment(raced)
            }
            throw err
        }
    }

    async create(actor: Actor, input: z.infer<typeof paymentCreateSchema>) {
        return this.recordPayment({
            bookingId: input.bookingId,
            amountCents: input.amountCents,
            method: input.method,
            paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
            notes: input.notes ?? null,
            reference: input.reference ?? null,
            createdById: actor.id,
            actorId: actor.id,
        })
    }

    async update(actor: Actor, id: string, input: z.infer<typeof paymentUpdateSchema>) {
        const existing = await PaymentRepository.findById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Payment not found')
        if (existing.voidedAt) throw new AppError(400, 'PAYMENT_VOIDED', 'Cannot update a voided payment')

        const payment = await PaymentRepository.update(id, {
            ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
            ...(input.method !== undefined ? { method: input.method } : {}),
            ...(input.paidAt !== undefined ? { paidAt: new Date(input.paidAt) } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.reference !== undefined ? { reference: input.reference } : {}),
        })

        if (input.amountCents !== undefined || input.paidAt !== undefined) {
            await recomputeBookingPaymentState(existing.bookingId)
            const linked = await FinanceRepository.findEntryByPaymentId(id)
            if (linked && !linked.voidedAt) {
                await FinanceRepository.updateEntry(linked.id, {
                    ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
                    ...(input.paidAt !== undefined ? { occurredAt: new Date(input.paidAt) } : {}),
                })
            }
        }

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action: 'payment.updated',
            metadata: { paymentId: id, bookingId: existing.bookingId, changes: input },
        })

        const refreshed = await PaymentRepository.findById(payment.id)
        return serializePayment(refreshed!)
    }

    async void(actor: Actor, id: string, input: z.infer<typeof paymentVoidSchema>) {
        const existing = await PaymentRepository.findById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Payment not found')
        if (existing.voidedAt) throw new AppError(400, 'ALREADY_VOIDED', 'Payment is already voided')

        const payment = await PaymentRepository.update(id, {
            voidedAt: new Date(),
            voidReason: input.reason ?? null,
            voidedBy: { connect: { id: actor.id } },
        })

        await recomputeBookingPaymentState(existing.bookingId)

        const linked = await FinanceRepository.findEntryByPaymentId(id)
        if (linked && !linked.voidedAt) {
            await FinanceRepository.updateEntry(linked.id, {
                voidedAt: new Date(),
                voidReason: input.reason ?? 'Linked payment voided',
                voidedBy: { connect: { id: actor.id } },
            })
        }

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action: 'payment.voided',
            metadata: {
                paymentId: id,
                bookingId: existing.bookingId,
                reason: input.reason ?? null,
            },
        })

        const refreshed = await PaymentRepository.findById(payment.id)
        return serializePayment(refreshed!)
    }

    async summary(query: z.infer<typeof paymentSummarySchema>) {
        const from = query.from ? new Date(query.from) : undefined
        const to = query.to ? new Date(query.to) : undefined
        const [{ aggregate, byMethod }, statusCounts, overdueCount, outstandingCents] = await Promise.all([
            PaymentRepository.summary(from, to),
            BookingRepository.countByPaymentStatus(),
            BookingRepository.countOverdue(),
            BookingRepository.outstandingCents(),
        ])

        const byPaymentStatus = Object.fromEntries(
            statusCounts.map((row) => [row.paymentStatus, row._count._all]),
        ) as Record<string, number>

        return {
            from: from?.toISOString() ?? null,
            to: to?.toISOString() ?? null,
            collectedCents: aggregate._sum.amountCents ?? 0,
            collected: formatMoney(aggregate._sum.amountCents ?? 0, 'USD'),
            paymentCount: aggregate._count._all,
            byMethod: byMethod.map((row) => ({
                method: row.method,
                count: row._count._all,
                amountCents: row._sum.amountCents ?? 0,
                amount: formatMoney(row._sum.amountCents ?? 0, 'USD'),
            })),
            byPaymentStatus,
            overdueCount,
            outstandingCents,
            outstanding: formatMoney(outstandingCents, 'USD'),
        }
    }

    async exportCsv(query: z.infer<typeof paymentListSchema>) {
        const items = await PaymentRepository.listForExport({
            q: query.q,
            customerUserId: query.customerUserId,
            bookingId: query.bookingId,
            method: query.method,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            includeVoided: query.includeVoided ?? false,
        })

        const header = [
            'date',
            'customer',
            'booking',
            'quotation',
            'amount',
            'currency',
            'method',
            'status',
            'reference',
            'notes',
        ]
        const lines = [header.join(',')]
        for (const payment of items) {
            const customer = payment.customer
                ? displayName(payment.customer)
                : payment.booking.quotation?.customerName ||
                  payment.booking.quotation?.customerEmail ||
                  'Guest'
            lines.push(
                [
                    payment.paidAt.toISOString(),
                    csvEscape(customer),
                    csvEscape(payment.booking.title),
                    csvEscape(payment.booking.quotation?.number ?? ''),
                    (payment.amountCents / 100).toFixed(2),
                    payment.currency,
                    payment.method,
                    payment.voidedAt ? 'VOIDED' : 'RECORDED',
                    csvEscape(payment.reference ?? ''),
                    csvEscape(payment.notes ?? ''),
                ].join(','),
            )
        }
        return lines.join('\n')
    }
}

export default new PaymentService()
