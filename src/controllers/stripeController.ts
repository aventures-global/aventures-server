import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import StripeCheckoutService from '../services/stripeCheckoutService.js'

class StripeController {
    async createShareCheckoutSession(req: Request, res: Response) {
        const userId = req.auth?.userId
        if (!userId) {
            throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
        }
        res.json(await StripeCheckoutService.createShareCheckoutSession(userId, String(req.params.token)))
    }

    async webhook(req: Request, res: Response) {
        const signature = req.headers['stripe-signature']
        const rawBody = req.body
        if (!Buffer.isBuffer(rawBody)) {
            throw new AppError(400, 'STRIPE_BODY', 'Webhook requires raw body')
        }
        const result = await StripeCheckoutService.handleWebhookEvent(
            rawBody,
            typeof signature === 'string' ? signature : undefined,
        )
        res.json(result)
    }
}

export default new StripeController()
