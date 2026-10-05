import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import TourController from '../controllers/tourController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    slugParamSchema,
    tourCreateSchema,
    tourMoveSchema,
    tourUpdateSchema,
} from '../schemas/index.js'

const router = Router()

// Suggestions can call the public Nominatim geocoder, so cap them per visitor.
const suggestLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
        res.status(429).json({
            error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        })
    },
})

router.get('/', TourController.list)
router.get('/featured', TourController.listFeatured)
router.get('/search', TourController.search)
router.get('/suggest', suggestLimiter, TourController.suggest)
router.get('/:slug', validate(slugParamSchema, 'params'), TourController.getBySlug)
router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), validate(tourCreateSchema), TourController.create)
router.post('/:slug/move', requireAuth, requireRole('STAFF', 'ADMIN'), validate(slugParamSchema, 'params'), validate(tourMoveSchema), TourController.move)
router.patch('/:slug', requireAuth, requireRole('STAFF', 'ADMIN'), validate(slugParamSchema, 'params'), validate(tourUpdateSchema), TourController.updateBySlug)
router.delete('/:slug', requireAuth, requireRole('STAFF', 'ADMIN'), validate(slugParamSchema, 'params'), TourController.deleteBySlug)

export default router
