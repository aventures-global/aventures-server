import { Router } from 'express'

import TestimonialController from '../controllers/testimonialController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
  idParamSchema,
  testimonialCreateSchema,
  testimonialUpdateSchema,
} from '../schemas/index.js'

const router = Router()

router.get('/', (_req, res, next) => {
  void TestimonialController.list(_req, res).catch(next)
})

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(testimonialCreateSchema),
  (req, res, next) => {
    void TestimonialController.create(req, res).catch(next)
  },
)

router.patch(
  '/:id',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(idParamSchema, 'params'),
  validate(testimonialUpdateSchema),
  (req, res, next) => {
    void TestimonialController.updateById(req, res).catch(next)
  },
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  validate(idParamSchema, 'params'),
  (req, res, next) => {
    void TestimonialController.deleteById(req, res).catch(next)
  },
)

export default router
