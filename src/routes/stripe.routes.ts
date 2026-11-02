import { Router } from 'express'

import StripeController from '../controllers/stripeController.js'

export const stripeWebhookRouter = Router()

stripeWebhookRouter.post('/webhook', StripeController.webhook)
