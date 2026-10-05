import { Router } from 'express'

import VisaController from '../controllers/visaController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    visaFinderUpdateSchema,
    visaIdParamSchema,
    visaPageSlugParamSchema,
    visaPageUpdateSchema,
    visaServiceUpdateSchema,
} from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireRole('STAFF', 'ADMIN')]

router.get('/', VisaController.getCatalog)
router.patch('/pages/:slug', ...staff, validate(visaPageSlugParamSchema, 'params'), validate(visaPageUpdateSchema), VisaController.updatePage)
router.patch('/services/:id', ...staff, validate(visaIdParamSchema, 'params'), validate(visaServiceUpdateSchema), VisaController.updateService)
router.patch('/finder', ...staff, validate(visaFinderUpdateSchema), VisaController.updateFinder)

export default router
