import { Router } from 'express'

import AdminUserController from '../controllers/adminUserController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStaff, requireSuperAdmin } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { adminUserRoleSchema, adminUserUpdateSchema, idParamSchema } from '../schemas/index.js'

const router = Router()

router.use(requireAuth, requireStaff)

router.get('/', AdminUserController.list)
router.get('/:id', validate(idParamSchema, 'params'), AdminUserController.getById)
router.patch('/:id', validate(idParamSchema, 'params'), validate(adminUserUpdateSchema), AdminUserController.updateById)
router.patch('/:id/role', requireSuperAdmin, validate(idParamSchema, 'params'), validate(adminUserRoleSchema), AdminUserController.setRole)

export default router
