import { Router } from 'express'

import FaqController from '../controllers/faqController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    faqCategoryCreateSchema,
    faqCategoryReorderSchema,
    faqCategoryUpdateSchema,
    faqCreateSchema,
    faqTopAddSchema,
    faqUpdateSchema,
    idParamSchema,
} from '../schemas/index.js'

const router = Router()
const staff = [requireAuth, requireRole('STAFF', 'ADMIN')]

router.get('/', FaqController.listPublic)
router.get('/admin', ...staff, FaqController.listAdmin)

router.post('/categories', ...staff, validate(faqCategoryCreateSchema), FaqController.createCategory)
router.put('/categories/order', ...staff, validate(faqCategoryReorderSchema), FaqController.reorderCategories)
router.patch('/categories/:id', ...staff, validate(idParamSchema, 'params'), validate(faqCategoryUpdateSchema), FaqController.updateCategory)
router.delete('/categories/:id', ...staff, validate(idParamSchema, 'params'), FaqController.deleteCategory)

router.post('/top', ...staff, validate(faqTopAddSchema), FaqController.addTop)
router.delete('/top/:id', ...staff, validate(idParamSchema, 'params'), FaqController.removeTop)

router.post('/', ...staff, validate(faqCreateSchema), FaqController.createFaq)
router.patch('/:id', ...staff, validate(idParamSchema, 'params'), validate(faqUpdateSchema), FaqController.updateFaq)
router.delete('/:id', ...staff, validate(idParamSchema, 'params'), FaqController.deleteFaq)

export default router
