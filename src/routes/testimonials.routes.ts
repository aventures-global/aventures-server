import { Router } from 'express'

import TestimonialController from '../controllers/testimonialController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    idParamSchema,
    testimonialCreateSchema,
    testimonialReorderSchema,
    testimonialUpdateSchema,
} from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireRole('STAFF', 'ADMIN')]

router.get('/', TestimonialController.list)
router.post('/', ...staff, validate(testimonialCreateSchema), TestimonialController.create)
router.put('/order', ...staff, validate(testimonialReorderSchema), TestimonialController.reorder)
router.patch('/:id', ...staff, validate(idParamSchema, 'params'), validate(testimonialUpdateSchema), TestimonialController.updateById)
router.delete('/:id', ...staff, validate(idParamSchema, 'params'), TestimonialController.deleteById)

export default router
