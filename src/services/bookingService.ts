import type { BookingPaymentStatus, User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { formatMoney } from '../lib/money.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import BookingRepository, {
    type BookingListItem,
    type BookingWithRelations,
} from '../repositories/bookingRepository.js'
import { bookingListSchema, bookingUpdateSchema } from '../schemas/index.js'

type Actor = Pick<User, 'id' | 'role'>

function displayName(user: { firstName: string | null; lastName: string | null; email: string | null }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return name || user.email || 'Customer'
}

function serializePerson(person: BookingListItem['customer'] | null) {
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

export function computePaymentStatus(totalCents: number, paidCents: number): BookingPaymentStatus {
    if (paidCents <= 0) return 'UNPAID'
    if (paidCents < totalCents) return 'PARTIAL'
    if (paidCents === totalCents) return 'PAID'
    return 'OVERPAID'
}

export function isBookingOverdue(booking: {
    dueAt: Date | null
    paymentStatus: BookingPaymentStatus
}) {
    if (!booking.dueAt) return false
    if (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'OVERPAID') return false
    return booking.dueAt.getTime() < Date.now()
}

function serializeBookingBase(booking: BookingListItem | BookingWithRelations) {
    const remainingCents = Math.max(0, booking.totalCents - booking.paidCents)
    const overdue = isBookingOverdue(booking)
    return {
        id: booking.id,
        customerUserId: booking.customerUserId,
        customer: serializePerson(booking.customer),
        quotationId: booking.quotationId,
        quotation: booking.quotation
            ? {
                  id: booking.quotation.id,
                  number: booking.quotation.number,
                  title: booking.quotation.title,
                  status: 'status' in booking.quotation ? booking.quotation.status : undefined,
                  customerName: booking.quotation.customerName,
                  customerEmail: booking.quotation.customerEmail,
              }
            : null,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        isOverdue: overdue,
        paidCents: booking.paidCents,
        paid: formatMoney(booking.paidCents, booking.currency),
        remainingCents,
        remaining: formatMoney(remainingCents, booking.currency),
        totalCents: booking.totalCents,
        total: formatMoney(booking.totalCents, booking.currency),
        currency: booking.currency,
        title: booking.title,
        notes: booking.notes,
        dueAt: booking.dueAt?.toISOString() ?? null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
    }
}

function serializePaymentRow(payment: BookingWithRelations['payments'][number]) {
    return {
        id: payment.id,
        amountCents: payment.amountCents,
        amount: formatMoney(payment.amountCents, payment.currency),
        currency: payment.currency,
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        notes: payment.notes,
        reference: payment.reference,
        voidedAt: payment.voidedAt?.toISOString() ?? null,
        voidReason: payment.voidReason,
        createdBy: serializePerson(payment.createdBy),
        createdAt: payment.createdAt.toISOString(),
    }
}

class BookingService {
    async list(query: z.infer<typeof bookingListSchema>) {
        const skip = (query.page - 1) * query.limit
        const { items, total } = await BookingRepository.list({
            q: query.q,
            customerUserId: query.customerUserId,
            paymentStatus: query.paymentStatus,
            skip,
            take: query.limit,
        })
        return {
            items: items.map(serializeBookingBase),
            total,
            page: query.page,
            limit: query.limit,
        }
    }

    async get(id: string) {
        const booking = await BookingRepository.findById(id)
        if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found')
        return {
            ...serializeBookingBase(booking),
            payments: booking.payments.map(serializePaymentRow),
        }
    }

    async update(actor: Actor, id: string, input: z.infer<typeof bookingUpdateSchema>) {
        const existing = await BookingRepository.findById(id)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Booking not found')

        const booking = await BookingRepository.update(id, {
            ...(input.dueAt !== undefined
                ? { dueAt: input.dueAt === null ? null : new Date(input.dueAt) }
                : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
        })

        if (input.dueAt !== undefined) {
            await AuditLogRepository.create({
                actorId: actor.id,
                subjectUserId: existing.customerUserId,
                action: 'booking.due_updated',
                metadata: { bookingId: id, dueAt: input.dueAt },
            })
        }

        return {
            ...serializeBookingBase(booking),
            payments: booking.payments.map(serializePaymentRow),
        }
    }
}

export default new BookingService()
