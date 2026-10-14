import { Router } from 'express'

import SettingsController from '../controllers/settingsController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff, requireSuperAdmin } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { businessSettingsSchema, rolePermissionsSchema } from '../schemas/index.js'

/** Mounted at `/settings`. Business contact details are public; the role matrix is staff-only. */
const router = Router()

router.get('/business', SettingsController.getBusiness)
router.put(
    '/business',
    requireAuth,
    requirePermission('business.edit'),
    validate(businessSettingsSchema),
    SettingsController.updateBusiness,
)
router.get('/roles', requireAuth, requireStaff, SettingsController.getRoles)
router.put('/roles', requireAuth, requireSuperAdmin, validate(rolePermissionsSchema), SettingsController.updateRoles)

export default router
