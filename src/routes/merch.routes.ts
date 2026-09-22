import { Router } from 'express'

import MerchController from '../controllers/merchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
  merchCreateSchema,
  merchUpdateSchema,
  slugParamSchema,
} from '../schemas/index.js'

const router = Router()

router.get('/', (_req, res, next) => {
  void MerchController.list(_req, res).catch(next)
})

router.get('/:slug', validate(slugParamSchema, 'params'), (req, res, next) => {
  void MerchController.getBySlug(req, res).catch(next)
})

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(merchCreateSchema),
  (req, res, next) => {
    void MerchController.create(req, res).catch(next)
  },
)

router.patch(
  '/:slug',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(slugParamSchema, 'params'),
  validate(merchUpdateSchema),
  (req, res, next) => {
    void MerchController.updateBySlug(req, res).catch(next)
  },
)

router.delete(
  '/:slug',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(slugParamSchema, 'params'),
  (req, res, next) => {
    void MerchController.deleteBySlug(req, res).catch(next)
  },
)

export default router
