import { Router } from 'express'

import PartnerController from '../controllers/partnerController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    idParamSchema,
    partnerCreateSchema,
    partnerReorderSchema,
    partnerUpdateSchema,
} from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireRole('STAFF', 'ADMIN')]

router.get('/', PartnerController.list)
router.post('/', ...staff, validate(partnerCreateSchema), PartnerController.create)
router.put('/order', ...staff, validate(partnerReorderSchema), PartnerController.reorder)
router.patch('/:id', ...staff, validate(idParamSchema, 'params'), validate(partnerUpdateSchema), PartnerController.updateById)
router.delete('/:id', ...staff, validate(idParamSchema, 'params'), PartnerController.deleteById)

export default router
