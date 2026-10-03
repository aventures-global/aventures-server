import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import InquiryController from '../controllers/inquiryController.js'
import { validate } from '../middleware/validate.js'
import { inquirySchema } from '../schemas/index.js'

const router = Router()

const inquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Opt-in only, so a production host that leaves NODE_ENV unset keeps the limit.
    skip: () => process.env.NODE_ENV === 'development',
    handler: (_req, res) => {
        res.status(429).json({
            error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        })
    },
})

router.post('/', inquiryLimiter, validate(inquirySchema), InquiryController.create)

export default router
