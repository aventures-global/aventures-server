import { Router } from 'express'

import TourController from '../controllers/tourController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
  slugParamSchema,
  tourCreateSchema,
  tourUpdateSchema,
} from '../schemas/index.js'

const router = Router()

router.get('/', (_req, res, next) => {
  void TourController.list(_req, res).catch(next)
})

router.get('/featured', (_req, res, next) => {
  void TourController.listFeatured(_req, res).catch(next)
})

router.get('/:slug', validate(slugParamSchema, 'params'), (req, res, next) => {
  void TourController.getBySlug(req, res).catch(next)
})

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(tourCreateSchema),
  (req, res, next) => {
    void TourController.create(req, res).catch(next)
  },
)

router.patch(
  '/:slug',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(slugParamSchema, 'params'),
  validate(tourUpdateSchema),
  (req, res, next) => {
    void TourController.updateBySlug(req, res).catch(next)
  },
)

router.delete(
  '/:slug',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(slugParamSchema, 'params'),
  (req, res, next) => {
    void TourController.deleteBySlug(req, res).catch(next)
  },
)

export default router
