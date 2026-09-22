import { Router } from 'express'

import PartnerController from '../controllers/partnerController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
  idParamSchema,
  partnerCreateSchema,
  partnerUpdateSchema,
} from '../schemas/index.js'

const router = Router()

router.get('/', (_req, res, next) => {
  void PartnerController.list(_req, res).catch(next)
})

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(partnerCreateSchema),
  (req, res, next) => {
    void PartnerController.create(req, res).catch(next)
  },
)

router.patch(
  '/:id',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(idParamSchema, 'params'),
  validate(partnerUpdateSchema),
  (req, res, next) => {
    void PartnerController.updateById(req, res).catch(next)
  },
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(idParamSchema, 'params'),
  (req, res, next) => {
    void PartnerController.deleteById(req, res).catch(next)
  },
)

export default router
