import { Router } from 'express'

import FinanceController from '../controllers/financeController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    financeCategoryCreateSchema,
    financeCategoryUpdateSchema,
    financeEntryCreateSchema,
    financeEntryUpdateSchema,
    financeEntryVoidSchema,
    idParamSchema,
} from '../schemas/index.js'

export const adminFinanceRouter = Router()

adminFinanceRouter.use(requireAuth, requireStaff)

adminFinanceRouter.get('/categories', requirePermission('finance.view'), FinanceController.listCategories)
adminFinanceRouter.post(
    '/categories',
    requirePermission('finance.manage'),
    validate(financeCategoryCreateSchema),
    FinanceController.createCategory,
)
adminFinanceRouter.patch(
    '/categories/:id',
    requirePermission('finance.manage'),
    validate(idParamSchema, 'params'),
    validate(financeCategoryUpdateSchema),
    FinanceController.updateCategory,
)

adminFinanceRouter.get('/entries', requirePermission('finance.view'), FinanceController.listEntries)
adminFinanceRouter.get('/summary', requirePermission('finance.view'), FinanceController.summary)
adminFinanceRouter.post(
    '/entries',
    requirePermission('finance.manage'),
    validate(financeEntryCreateSchema),
    FinanceController.createEntry,
)
adminFinanceRouter.get(
    '/entries/:id',
    requirePermission('finance.view'),
    validate(idParamSchema, 'params'),
    FinanceController.getEntry,
)
adminFinanceRouter.patch(
    '/entries/:id',
    requirePermission('finance.manage'),
    validate(idParamSchema, 'params'),
    validate(financeEntryUpdateSchema),
    FinanceController.updateEntry,
)
adminFinanceRouter.post(
    '/entries/:id/void',
    requirePermission('finance.manage'),
    validate(idParamSchema, 'params'),
    validate(financeEntryVoidSchema),
    FinanceController.voidEntry,
)
