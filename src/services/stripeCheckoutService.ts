import { createHash } from 'node:crypto'
import type Stripe from 'stripe'

import { AppError } from '../lib/errors.js'
import { formatMoney } from '../lib/money.js'
import { getStripe } from '../lib/stripe.js'
import BookingRepository from '../repositories/bookingRepository.js'
import QuotationRepository from '../repositories/quotationRepository.js'
import UserRepository from '../repositories/userRepository.js'
import PaymentService from './paymentService.js'

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

function clientOrigin() {
    return (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '')
}

/** Checkout allows payment after a successful view; do not re-apply maxViews. */
function assertSharePayable(share: {
    revokedAt: Date | null
    expiresAt: Date
    quotation: { deletedAt: Date | null } | null
}) {
    if (!share.quotation || share.quotation.deletedAt) {
        throw new AppError(404, 'NOT_FOUND', 'Share link not found')
    }
    if (share.revokedAt) throw new AppError(410, 'SHARE_REVOKED', 'This share link was revoked')
    if (share.expiresAt.getTime() < Date.now()) {
        throw new AppError(410, 'SHARE_EXPIRED', 'This share link has expired')
    }
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
    const pi = session.payment_intent
    if (!pi) return null
    return typeof pi === 'string' ? pi : pi.id
}

class StripeCheckoutService {
    async createShareCheckoutSession(authUserId: string, token: string) {
        const user = await UserRepository.findById(authUserId)
        if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not bootstrapped')

        const share = await QuotationRepository.findShareByTokenHash(hashToken(token))
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share link not found')
        assertSharePayable(share)

        const quote = share.quotation
        if (quote.customerUserId !== authUserId) {
            throw new AppError(
                403,
                'FORBIDDEN',
                'Sign in with the account this quotation was issued to in order to pay',
            )
        }

        const booking = quote.booking
        if (!booking) {
            throw new AppError(
                400,
                'NOT_PAYABLE',
                'Online payment is not available for this quotation yet',
            )
        }
        if (booking.status === 'CANCELLED') {
            throw new AppError(400, 'BOOKING_CANCELLED', 'This booking was cancelled')
        }

        // Refresh paid state from active payments in case booking.paidCents is stale.
        const paidCents = await BookingRepository.sumActivePayments(booking.id)
        const remainingCents = Math.max(0, booking.totalCents - paidCents)
        if (remainingCents <= 0) {
            throw new AppError(400, 'ALREADY_PAID', 'This booking has no remaining balance')
        }

        const origin = clientOrigin()
        const returnToken = encodeURIComponent(token)
        const stripe = getStripe()
        const preferredCurrency = user.preferredCurrency === 'PHP' ? 'PHP' : 'USD'
        const bookingCurrency = booking.currency.toUpperCase()
        // Adaptive Pricing keeps the ledger in USD and lets Stripe present a local currency (e.g. PHP).
        const enableAdaptivePricing = preferredCurrency === 'PHP' && bookingCurrency === 'USD'

        let session: Stripe.Checkout.Session
        try {
            session = await stripe.checkout.sessions.create({
                mode: 'payment',
                client_reference_id: booking.id,
                customer_email: user.email ?? undefined,
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency: booking.currency.toLowerCase(),
                            unit_amount: remainingCents,
                            product_data: {
                                name: booking.title,
                                description: quote.number ? `Quotation ${quote.number}` : undefined,
                            },
                        },
                    },
                ],
                adaptive_pricing: { enabled: enableAdaptivePricing },
                metadata: {
                    bookingId: booking.id,
                    customerUserId: quote.customerUserId,
                    quotationId: quote.id,
                    shareId: share.id,
                    preferredCurrency,
                },
                success_url: `${origin}/payments/complete?status=success&token=${returnToken}`,
                cancel_url: `${origin}/payments/complete?status=cancel&token=${returnToken}`,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to start Stripe Checkout'
            throw new AppError(400, 'STRIPE_ERROR', message)
        }

        if (!session.url) {
            throw new AppError(500, 'STRIPE_ERROR', 'Stripe did not return a checkout URL')
        }

        return {
            url: session.url,
            sessionId: session.id,
            amountCents: remainingCents,
            amount: formatMoney(remainingCents, booking.currency),
            currency: booking.currency,
        }
    }

    async handleWebhookEvent(rawBody: Buffer, signature: string | undefined) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
        if (!secret) throw new AppError(500, 'STRIPE_MISCONFIGURED', 'STRIPE_WEBHOOK_SECRET is not set')
        if (!signature) throw new AppError(400, 'STRIPE_SIGNATURE', 'Missing Stripe signature')

        const stripe = getStripe()
        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, secret)
        } catch {
            throw new AppError(400, 'STRIPE_SIGNATURE', 'Invalid Stripe webhook signature')
        }

        if (event.type !== 'checkout.session.completed') {
            return { received: true, handled: false }
        }

        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
            return { received: true, handled: false }
        }

        const bookingId = session.metadata?.bookingId ?? session.client_reference_id
        if (!bookingId) {
            throw new AppError(400, 'STRIPE_METADATA', 'Checkout session missing booking id')
        }

        const amountCents = session.amount_total
        if (amountCents == null || amountCents <= 0) {
            throw new AppError(400, 'STRIPE_AMOUNT', 'Checkout session has no payable amount')
        }

        const paymentIntent = paymentIntentId(session)
        const presentment = (
            session as Stripe.Checkout.Session & {
                presentment_details?: { presentment_amount?: number; presentment_currency?: string } | null
            }
        ).presentment_details
        const notes =
            presentment?.presentment_currency && presentment.presentment_amount != null
                ? `Stripe Checkout (presented ${presentment.presentment_amount} ${presentment.presentment_currency.toUpperCase()})`
                : 'Stripe Checkout'

        await PaymentService.recordPayment({
            bookingId,
            amountCents,
            method: 'STRIPE',
            paidAt: new Date(),
            reference: paymentIntent,
            notes,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntent,
            createdById: session.metadata?.customerUserId ?? null,
            actorId: session.metadata?.customerUserId ?? null,
        })

        return { received: true, handled: true }
    }
}

export default new StripeCheckoutService()
