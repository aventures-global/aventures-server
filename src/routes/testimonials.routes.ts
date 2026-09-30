import { Router } from 'express'

import TestimonialController from '../controllers/testimonialController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { idParamSchema, testimonialCreateSchema, testimonialUpdateSchema } from '../schemas/index.js'

const router = Router()

router.get('/', TestimonialController.list)
router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), validate(testimonialCreateSchema), TestimonialController.create)
router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), validate(idParamSchema, 'params'), validate(testimonialUpdateSchema), TestimonialController.updateById)
router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), validate(idParamSchema, 'params'), TestimonialController.deleteById)

export default router
