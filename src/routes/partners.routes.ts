import { Router } from 'express'

import PartnerController from '../controllers/partnerController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { idParamSchema, partnerCreateSchema, partnerUpdateSchema } from '../schemas/index.js'

const router = Router()

router.get('/', PartnerController.list)
router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), validate(partnerCreateSchema), PartnerController.create)
router.patch('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), validate(idParamSchema, 'params'), validate(partnerUpdateSchema), PartnerController.updateById)
router.delete('/:id', requireAuth, requireRole('STAFF', 'ADMIN'), validate(idParamSchema, 'params'), PartnerController.deleteById)

export default router
