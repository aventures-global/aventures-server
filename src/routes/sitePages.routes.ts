import { Router } from 'express'

import SitePageController from '../controllers/sitePageController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireContentEditor } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { sitePageIdParamSchema } from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireContentEditor]

router.get('/:id', validate(sitePageIdParamSchema, 'params'), SitePageController.get)
router.put('/:id', ...staff, validate(sitePageIdParamSchema, 'params'), SitePageController.replace)

export default router
