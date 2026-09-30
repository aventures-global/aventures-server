import { Router } from 'express'

import MerchController from '../controllers/merchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { merchCreateSchema, merchUpdateSchema, slugParamSchema } from '../schemas/index.js'

const router = Router()

router.get('/', MerchController.list)
router.get('/:slug', validate(slugParamSchema, 'params'), MerchController.getBySlug)
router.post('/', requireAuth, requireRole('STAFF', 'ADMIN'), validate(merchCreateSchema), MerchController.create)
router.patch('/:slug', requireAuth, requireRole('STAFF', 'ADMIN'), validate(slugParamSchema, 'params'), validate(merchUpdateSchema), MerchController.updateBySlug)
router.delete('/:slug', requireAuth, requireRole('STAFF', 'ADMIN'), validate(slugParamSchema, 'params'), MerchController.deleteBySlug)

export default router
