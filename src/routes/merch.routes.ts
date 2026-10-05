import { Router } from 'express'

import MerchController from '../controllers/merchController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    idParamSchema,
    merchCategoryCreateSchema,
    merchCategoryReorderSchema,
    merchCategoryUpdateSchema,
    merchCreateSchema,
    merchUpdateSchema,
    slugParamSchema,
} from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireRole('STAFF', 'ADMIN')]

router.get('/categories', MerchController.listCategories)
router.post('/categories', ...staff, validate(merchCategoryCreateSchema), MerchController.createCategory)
router.put('/categories/order', ...staff, validate(merchCategoryReorderSchema), MerchController.reorderCategories)
router.patch('/categories/:id', ...staff, validate(idParamSchema, 'params'), validate(merchCategoryUpdateSchema), MerchController.renameCategory)
router.delete('/categories/:id', ...staff, validate(idParamSchema, 'params'), MerchController.deleteCategory)

router.get('/', MerchController.list)
router.get('/:slug', validate(slugParamSchema, 'params'), MerchController.getBySlug)
router.post('/', ...staff, validate(merchCreateSchema), MerchController.create)
router.patch('/:slug', ...staff, validate(slugParamSchema, 'params'), validate(merchUpdateSchema), MerchController.updateBySlug)
router.delete('/:slug', ...staff, validate(slugParamSchema, 'params'), MerchController.deleteBySlug)

export default router
