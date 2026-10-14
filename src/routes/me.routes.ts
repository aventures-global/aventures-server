import { Router } from 'express'

import MeController from '../controllers/meController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { bootstrapSchema, preferencesUpdateSchema, updateMeSchema } from '../schemas/index.js'

const router = Router()

router.post('/bootstrap', requireAuth, validate(bootstrapSchema), MeController.bootstrap)
router.get('/', requireAuth, MeController.getMe)
router.patch('/', requireAuth, validate(updateMeSchema), MeController.updateMe)
router.get('/preferences', requireAuth, MeController.getPreferences)
router.put('/preferences', requireAuth, validate(preferencesUpdateSchema), MeController.updatePreferences)

export default router
