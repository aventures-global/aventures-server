import { createHash, randomBytes } from 'node:crypto'
import type { Readable } from 'node:stream'
import type { QuotationStatus, User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { renderQuotationEmail } from '../emails/quotationEmail.js'
import { DEFAULT_BUSINESS_SETTINGS } from '../lib/businessSettings.js'
import { AppError, isAppError } from '../lib/errors.js'
import { sendEmail } from '../lib/mailer.js'
import { formatMoney } from '../lib/money.js'
import { buildQuotationPdf } from '../lib/quotationPdf.js'
import {
    attachmentDisposition,
    buildPrivateDocumentKey,
    getObjectBuffer,
    getObjectStream,
    putPrivateObject,
} from '../lib/storage.js'
import AppSettingRepository from '../repositories/appSettingRepository.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import QuotationRepository, {
    type QuotationWithRelations,
} from '../repositories/quotationRepository.js'
import UserRepository from '../repositories/userRepository.js'
import {
    quotationCreateSchema,
    quotationItemInputSchema,
    quotationListSchema,
    quotationShareCreateSchema,
    quotationStatusSchema,
    quotationUpdateSchema,
} from '../schemas/index.js'
import { businessSettingsSchema } from '../schemas/index.js'

type Actor = Pick<User, 'id' | 'role'>
type ItemInput = z.infer<typeof quotationItemInputSchema>

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

function clientOrigin() {
    return (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '')
}

function displayName(user: { firstName: string | null; lastName: string | null; email: string | null }) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return name || user.email || 'Customer'
}

function normalizeItems(items: ItemInput[]) {
    return items.map((item, index) => {
        const isOptional = item.isOptional ?? item.kind === 'OPTIONAL'
        const selected = item.selected ?? !isOptional
        const quantity = item.quantity
        const unitCents = item.unitCents
        return {
            kind: item.kind,
            title: item.title,
            description: item.description ?? null,
            quantity,
            unitCents,
            lineCents: quantity * unitCents,
            isOptional,
            selected,
            sortOrder: item.sortOrder ?? index,
        }
    })
}

function computeTotals(items: ReturnType<typeof normalizeItems>) {
    const included = items.filter((item) => item.selected)
    const subtotalCents = included.filter((item) => !item.isOptional).reduce((sum, item) => sum + item.lineCents, 0)
    const optionalCents = included.filter((item) => item.isOptional).reduce((sum, item) => sum + item.lineCents, 0)
    return {
        subtotalCents,
        optionalCents,
        totalCents: subtotalCents + optionalCents,
    }
}

function serializeItem(item: QuotationWithRelations['items'][number]) {
    return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unitCents: item.unitCents,
        lineCents: item.lineCents,
        isOptional: item.isOptional,
        selected: item.selected,
        sortOrder: item.sortOrder,
    }
}

function serializePerson(person: QuotationWithRelations['customer'] | null) {
    if (!person) return null
    return {
        id: person.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        profilePicture: person.profilePicture ?? null,
        displayName: displayName(person),
    }
}

function serializeShare(
    share: {
        id: string
        expiresAt: Date
        revokedAt: Date | null
        viewCount: number
        maxViews: number | null
        createdAt: Date
    },
    token?: string,
) {
    return {
        id: share.id,
        expiresAt: share.expiresAt.toISOString(),
        revokedAt: share.revokedAt?.toISOString() ?? null,
        viewCount: share.viewCount,
        maxViews: share.maxViews,
        createdAt: share.createdAt.toISOString(),
        ...(token
            ? {
                  token,
                  url: `${clientOrigin()}/quotes/shared/${token}`,
              }
            : {}),
    }
}

function serializeQuotation(quote: QuotationWithRelations) {
    return {
        id: quote.id,
        number: quote.number,
        status: quote.status,
        currency: quote.currency,
        title: quote.title,
        notes: quote.notes,
        customerMessage: quote.customerMessage,
        validUntil: quote.validUntil?.toISOString() ?? null,
        subtotalCents: quote.subtotalCents,
        optionalCents: quote.optionalCents,
        totalCents: quote.totalCents,
        subtotal: formatMoney(quote.subtotalCents, quote.currency),
        optional: formatMoney(quote.optionalCents, quote.currency),
        total: formatMoney(quote.totalCents, quote.currency),
        customer: serializePerson(quote.customer),
        createdBy: serializePerson(quote.createdBy),
        updatedBy: serializePerson(quote.updatedBy),
        sentAt: quote.sentAt?.toISOString() ?? null,
        acceptedAt: quote.acceptedAt?.toISOString() ?? null,
        declinedAt: quote.declinedAt?.toISOString() ?? null,
        convertedAt: quote.convertedAt?.toISOString() ?? null,
        hasPdf: Boolean(quote.pdfStorageKey),
        booking: quote.booking
            ? {
                  id: quote.booking.id,
                  status: quote.booking.status,
                  paymentStatus: quote.booking.paymentStatus,
                  paidCents: quote.booking.paidCents,
                  paid: formatMoney(quote.booking.paidCents, quote.booking.currency),
                  remainingCents: Math.max(0, quote.booking.totalCents - quote.booking.paidCents),
                  remaining: formatMoney(
                      Math.max(0, quote.booking.totalCents - quote.booking.paidCents),
                      quote.booking.currency,
                  ),
                  title: quote.booking.title,
                  totalCents: quote.booking.totalCents,
                  currency: quote.booking.currency,
                  total: formatMoney(quote.booking.totalCents, quote.booking.currency),
                  dueAt: quote.booking.dueAt?.toISOString() ?? null,
              }
            : null,
        items: quote.items.map(serializeItem),
        shares: quote.shares.map((share) => serializeShare(share)),
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
    }
}

async function loadBusinessSettings() {
    const stored = businessSettingsSchema.safeParse(await AppSettingRepository.findValue('business'))
    return stored.success ? stored.data : DEFAULT_BUSINESS_SETTINGS
}

function assertShareActive(share: {
    revokedAt: Date | null
    expiresAt: Date
    viewCount: number
    maxViews: number | null
    quotation: { deletedAt: Date | null; status: QuotationStatus } | null
}) {
    if (!share.quotation || share.quotation.deletedAt) {
        throw new AppError(404, 'NOT_FOUND', 'Share link not found')
    }
    if (share.revokedAt) throw new AppError(410, 'SHARE_REVOKED', 'This share link was revoked')
    if (share.expiresAt.getTime() < Date.now()) {
        throw new AppError(410, 'SHARE_EXPIRED', 'This share link has expired')
    }
    if (share.maxViews != null && share.viewCount >= share.maxViews) {
        throw new AppError(410, 'SHARE_EXHAUSTED', 'This share link has reached its view limit')
    }
}

class QuotationService {
    private async assertCustomer(customerUserId: string) {
        const customer = await UserRepository.findById(customerUserId)
        if (!customer || customer.role !== 'CUSTOMER') {
            throw new AppError(400, 'INVALID_CUSTOMER', 'Quotations must belong to a customer account')
        }
        return customer
    }

    private async getEditable(id: string) {
        const quote = await QuotationRepository.findById(id)
        if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found')
        return quote
    }

    private async maybeExpire(quote: QuotationWithRelations) {
        if (
            quote.status === 'SENT' &&
            quote.validUntil &&
            quote.validUntil.getTime() < Date.now()
        ) {
            const updated = await QuotationRepository.update(quote.id, {
                status: 'EXPIRED',
            })
            await AuditLogRepository.create({
                actorId: null,
                subjectUserId: quote.customerUserId,
                action: 'quotation.expired',
                metadata: { quotationId: quote.id, number: quote.number },
            })
            return updated
        }
        return quote
    }

    async list(query: z.infer<typeof quotationListSchema>) {
        const page = query.page
        const limit = query.limit
        const { items, total } = await QuotationRepository.list({
            q: query.q,
            status: query.status,
            customerUserId: query.customerUserId,
            skip: (page - 1) * limit,
            take: limit,
        })
        const expiredAware = await Promise.all(items.map((item) => this.maybeExpire(item)))
        return {
            items: expiredAware.map(serializeQuotation),
            total,
            page,
            limit,
        }
    }

    async get(id: string) {
        const quote = await this.maybeExpire(await this.getEditable(id))
        return { quotation: serializeQuotation(quote) }
    }

    async create(actor: Actor, input: z.infer<typeof quotationCreateSchema>) {
        await this.assertCustomer(input.customerUserId)
        const items = normalizeItems(input.items)
        const totals = computeTotals(items)
        const number = await QuotationRepository.nextNumber(new Date().getFullYear())
        const quote = await QuotationRepository.create({
            number,
            customerUserId: input.customerUserId,
            title: input.title,
            currency: input.currency,
            notes: input.notes ?? null,
            customerMessage: input.customerMessage ?? null,
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
            ...totals,
            createdById: actor.id,
            items,
        })
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: input.customerUserId,
            action: 'quotation.created',
            metadata: { quotationId: quote.id, number: quote.number },
        })
        return { quotation: serializeQuotation(quote) }
    }

    async update(actor: Actor, id: string, input: z.infer<typeof quotationUpdateSchema>) {
        const existing = await this.getEditable(id)
        if (existing.status !== 'DRAFT' && existing.status !== 'SENT') {
            throw new AppError(400, 'NOT_EDITABLE', 'Only draft or sent quotations can be edited')
        }

        const items = input.items ? normalizeItems(input.items) : undefined
        const totals = items ? computeTotals(items) : undefined

        const quote = await QuotationRepository.update(id, {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.customerMessage !== undefined ? { customerMessage: input.customerMessage } : {}),
            ...(input.validUntil !== undefined
                ? { validUntil: input.validUntil ? new Date(input.validUntil) : null }
                : {}),
            ...(totals
                ? {
                      subtotalCents: totals.subtotalCents,
                      optionalCents: totals.optionalCents,
                      totalCents: totals.totalCents,
                      pdfStorageKey: null,
                      pdfContentType: null,
                      pdfSizeBytes: null,
                  }
                : {}),
            updatedBy: { connect: { id: actor.id } },
            items,
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action: 'quotation.updated',
            metadata: { quotationId: id, number: existing.number },
        })
        return { quotation: serializeQuotation(quote) }
    }

    async changeStatus(actor: Actor, id: string, input: z.infer<typeof quotationStatusSchema>) {
        const existing = await this.maybeExpire(await this.getEditable(id))
        const now = new Date()
        let next: QuotationStatus
        let action: string
        const data: Record<string, unknown> = { updatedBy: { connect: { id: actor.id } } }

        switch (input.action) {
            case 'send':
                if (existing.status !== 'DRAFT' && existing.status !== 'SENT') {
                    throw new AppError(400, 'INVALID_STATUS', 'Only draft quotations can be sent')
                }
                next = 'SENT'
                action = 'quotation.sent'
                data.status = next
                data.sentAt = now
                break
            case 'accept':
                if (existing.status !== 'SENT') {
                    throw new AppError(400, 'INVALID_STATUS', 'Only sent quotations can be accepted')
                }
                next = 'ACCEPTED'
                action = 'quotation.accepted'
                data.status = next
                data.acceptedAt = now
                break
            case 'decline':
                if (existing.status !== 'SENT') {
                    throw new AppError(400, 'INVALID_STATUS', 'Only sent quotations can be declined')
                }
                next = 'DECLINED'
                action = 'quotation.declined'
                data.status = next
                data.declinedAt = now
                break
            case 'expire':
                if (existing.status !== 'SENT') {
                    throw new AppError(400, 'INVALID_STATUS', 'Only sent quotations can be expired')
                }
                next = 'EXPIRED'
                action = 'quotation.expired'
                data.status = next
                break
            default:
                throw new AppError(400, 'INVALID_STATUS', 'Unknown status action')
        }

        const quote = await QuotationRepository.update(id, data)
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action,
            metadata: { quotationId: id, number: existing.number, status: next },
        })
        return { quotation: serializeQuotation(quote) }
    }

    async generatePdf(actor: Actor, id: string, options?: { statusOverride?: QuotationStatus }) {
        const quote = await this.maybeExpire(await this.getEditable(id))
        const updated = await this.storePdf(actor, quote, options?.statusOverride ?? quote.status)
        return { quotation: serializeQuotation(updated) }
    }

    private async storePdf(actor: Actor, quote: QuotationWithRelations, status: QuotationStatus) {
        const business = await loadBusinessSettings()
        const buffer = await buildQuotationPdf({
            number: quote.number,
            title: quote.title,
            currency: quote.currency,
            status,
            customerName: displayName(quote.customer),
            customerEmail: quote.customer.email,
            customerMessage: quote.customerMessage,
            validUntil: quote.validUntil,
            issuedAt: quote.createdAt,
            subtotalCents: quote.subtotalCents,
            optionalCents: quote.optionalCents,
            totalCents: quote.totalCents,
            items: quote.items,
            business,
        })

        const key = buildPrivateDocumentKey('pdf').replace('/documents/', '/quotations/')
        await putPrivateObject({
            key,
            body: buffer,
            contentType: 'application/pdf',
            contentDisposition: attachmentDisposition(`${quote.number}.pdf`),
        })

        const updated = await QuotationRepository.update(quote.id, {
            pdfStorageKey: key,
            pdfContentType: 'application/pdf',
            pdfSizeBytes: buffer.length,
            updatedBy: { connect: { id: actor.id } },
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: quote.customerUserId,
            action: 'quotation.pdf',
            metadata: { quotationId: quote.id, number: quote.number, sizeBytes: buffer.length },
        })

        return updated
    }

    async sendByEmail(actor: Actor, id: string) {
        const existing = await this.maybeExpire(await this.getEditable(id))
        if (existing.status !== 'DRAFT' && existing.status !== 'SENT') {
            throw new AppError(400, 'INVALID_STATUS', 'Only draft or sent quotations can be emailed')
        }
        const customerEmail = existing.customer?.email?.trim()
        if (!customerEmail) {
            throw new AppError(400, 'CUSTOMER_EMAIL_MISSING', 'Customer has no email address')
        }

        let quote = existing
        if (!quote.pdfStorageKey || quote.status === 'DRAFT') {
            quote = await this.storePdf(actor, quote, 'SENT')
        }

        if (!quote.pdfStorageKey) {
            throw new AppError(500, 'PDF_MISSING', 'Could not prepare the quotation PDF')
        }

        const pdf = await getObjectBuffer(quote.pdfStorageKey)
        const token = randomBytes(32).toString('base64url')
        const share = await QuotationRepository.createShare({
            quotationId: quote.id,
            tokenHash: hashToken(token),
            createdById: actor.id,
            expiresAt: new Date(Date.now() + 168 * 60 * 60 * 1000),
            maxViews: null,
        })
        const shareUrl = `${clientOrigin()}/quotes/shared/${token}`

        try {
            const rendered = renderQuotationEmail({
                customerName: displayName(quote.customer),
                number: quote.number,
                title: quote.title,
                shareUrl,
                customerMessage: quote.customerMessage,
                validUntil: quote.validUntil,
                businessName: 'AVENtures',
                totalFormatted: formatMoney(quote.totalCents, quote.currency),
                siteUrl: process.env.PUBLIC_SITE_URL?.trim() || clientOrigin(),
            })
            await sendEmail({
                to: customerEmail,
                ...rendered,
                attachments: [
                    {
                        content: pdf.body.toString('base64'),
                        filename: `${quote.number}.pdf`,
                        type: 'application/pdf',
                        disposition: 'attachment',
                    },
                ],
            })
        } catch (err) {
            await QuotationRepository.revokeShare(share.id)
            if (isAppError(err)) throw err
            console.error('Quotation email failed', err instanceof Error ? err.message : err)
            throw new AppError(502, 'MAIL_SEND_FAILED', 'Could not send the quotation email')
        }

        const now = new Date()
        const updated = await QuotationRepository.update(id, {
            status: 'SENT',
            sentAt: quote.sentAt ?? now,
            updatedBy: { connect: { id: actor.id } },
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: quote.customerUserId,
            action: 'quotation.emailed',
            metadata: {
                quotationId: id,
                number: quote.number,
                shareId: share.id,
                to: customerEmail,
            },
        })
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: quote.customerUserId,
            action: 'quotation.share.create',
            metadata: { quotationId: id, shareId: share.id, via: 'email' },
        })

        const refreshed = await QuotationRepository.findById(updated.id)
        return {
            quotation: serializeQuotation(refreshed!),
            share: serializeShare(share, token),
        }
    }

    async openPdf(id: string): Promise<{
        stream: Readable
        contentType: string
        contentLength: number | undefined
        displayName: string
    }> {
        const quote = await this.getEditable(id)
        if (!quote.pdfStorageKey) {
            throw new AppError(404, 'PDF_MISSING', 'Generate the PDF before downloading')
        }
        const object = await getObjectStream(quote.pdfStorageKey)
        return {
            stream: object.body,
            contentType: quote.pdfContentType ?? object.contentType ?? 'application/pdf',
            contentLength: quote.pdfSizeBytes ?? object.contentLength,
            displayName: `${quote.number}.pdf`,
        }
    }

    async listShares(id: string) {
        await this.getEditable(id)
        const shares = await QuotationRepository.listShares(id)
        return { shares: shares.map((share) => serializeShare(share)) }
    }

    async createShare(actor: Actor, id: string, input: z.infer<typeof quotationShareCreateSchema>) {
        const quote = await this.getEditable(id)
        if (quote.status === 'DRAFT') {
            throw new AppError(400, 'NOT_SHAREABLE', 'Send the quotation before sharing it')
        }
        const token = randomBytes(32).toString('base64url')
        const share = await QuotationRepository.createShare({
            quotationId: id,
            tokenHash: hashToken(token),
            createdById: actor.id,
            expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
            maxViews: input.maxViews ?? null,
        })
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: quote.customerUserId,
            action: 'quotation.share.create',
            metadata: { quotationId: id, shareId: share.id },
        })
        return { share: serializeShare(share, token) }
    }

    async revokeShare(actor: Actor, shareId: string) {
        const share = await QuotationRepository.findShareById(shareId)
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share not found')
        const quote = await this.getEditable(share.quotationId)
        await QuotationRepository.revokeShare(shareId)
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: quote.customerUserId,
            action: 'quotation.share.revoke',
            metadata: { quotationId: quote.id, shareId },
        })
        return { ok: true }
    }

    async lookupShare(token: string) {
        const share = await QuotationRepository.findShareByTokenHash(hashToken(token))
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share link not found')
        assertShareActive(share)
        await QuotationRepository.incrementShareViews(share.id)
        const quote = share.quotation
        const booking = quote.booking
        const remainingCents = booking ? Math.max(0, booking.totalCents - booking.paidCents) : 0
        const payable = Boolean(
            booking &&
                booking.status !== 'CANCELLED' &&
                remainingCents > 0 &&
                (booking.paymentStatus === 'UNPAID' || booking.paymentStatus === 'PARTIAL'),
        )

        return {
            share: {
                id: share.id,
                expiresAt: share.expiresAt.toISOString(),
                viewCount: share.viewCount + 1,
                maxViews: share.maxViews,
                quotation: {
                    number: quote.number,
                    title: quote.title,
                    status: quote.status,
                    currency: quote.currency,
                    totalCents: quote.totalCents,
                    total: formatMoney(quote.totalCents, quote.currency),
                    customerMessage: quote.customerMessage,
                    validUntil: quote.validUntil?.toISOString() ?? null,
                    hasPdf: Boolean(quote.pdfStorageKey),
                    items: quote.items.map((item) => ({
                        title: item.title,
                        description: item.description,
                        quantity: item.quantity,
                        unitCents: item.unitCents,
                        lineCents: item.lineCents,
                        isOptional: item.isOptional,
                        selected: item.selected,
                        unit: formatMoney(item.unitCents, quote.currency),
                        line: formatMoney(item.lineCents, quote.currency),
                    })),
                    booking: booking
                        ? {
                              paymentStatus: booking.paymentStatus,
                              currency: booking.currency,
                              remainingCents,
                              remaining: formatMoney(remainingCents, booking.currency),
                              payable,
                          }
                        : null,
                },
            },
        }
    }

    async openSharePdf(token: string): Promise<{
        stream: Readable
        contentType: string
        contentLength: number | undefined
        displayName: string
    }> {
        const share = await QuotationRepository.findShareByTokenHash(hashToken(token))
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share link not found')
        assertShareActive(share)
        const quote = share.quotation
        if (!quote.pdfStorageKey) {
            throw new AppError(404, 'PDF_MISSING', 'PDF is not available for this quotation yet')
        }
        const object = await getObjectStream(quote.pdfStorageKey)
        return {
            stream: object.body,
            contentType: quote.pdfContentType ?? object.contentType ?? 'application/pdf',
            contentLength: quote.pdfSizeBytes ?? object.contentLength,
            displayName: `${quote.number}.pdf`,
        }
    }

    async convert(actor: Actor, id: string) {
        const existing = await this.getEditable(id)
        if (existing.status !== 'ACCEPTED') {
            throw new AppError(400, 'INVALID_STATUS', 'Only accepted quotations can be converted')
        }
        if (existing.booking) {
            throw new AppError(400, 'ALREADY_CONVERTED', 'This quotation already has a booking')
        }

        const booking = await QuotationRepository.createBooking({
            customerUserId: existing.customerUserId,
            quotationId: existing.id,
            title: existing.title,
            currency: existing.currency,
            totalCents: existing.totalCents,
            notes: existing.notes,
        })

        const quote = await QuotationRepository.update(id, {
            status: 'CONVERTED',
            convertedAt: new Date(),
            updatedBy: { connect: { id: actor.id } },
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action: 'quotation.converted',
            metadata: { quotationId: id, bookingId: booking.id, number: existing.number },
        })

        const refreshed = await QuotationRepository.findById(quote.id)
        return { quotation: serializeQuotation(refreshed!), booking: { id: booking.id } }
    }

    async remove(actor: Actor, id: string) {
        const existing = await this.getEditable(id)
        if (existing.status !== 'DRAFT') {
            throw new AppError(400, 'NOT_DELETABLE', 'Only draft quotations can be deleted')
        }
        await QuotationRepository.softDelete(id, actor.id)
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: existing.customerUserId,
            action: 'quotation.deleted',
            metadata: { quotationId: id, number: existing.number },
        })
        return { ok: true }
    }
}

export default new QuotationService()
