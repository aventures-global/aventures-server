import { Router } from 'express'

import QuotationController from '../controllers/quotationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    idParamSchema,
    quotationCreateSchema,
    quotationShareCreateSchema,
    quotationStatusSchema,
    quotationUpdateSchema,
    shareTokenParamSchema,
} from '../schemas/index.js'

export const adminQuotationsRouter = Router()

adminQuotationsRouter.use(requireAuth, requireStaff)

adminQuotationsRouter.get('/', requirePermission('quotations.view'), QuotationController.list)
adminQuotationsRouter.post(
    '/',
    requirePermission('quotations.manage'),
    validate(quotationCreateSchema),
    QuotationController.create,
)
adminQuotationsRouter.get(
    '/:id',
    requirePermission('quotations.view'),
    validate(idParamSchema, 'params'),
    QuotationController.get,
)
adminQuotationsRouter.patch(
    '/:id',
    requirePermission('quotations.manage'),
    validate(idParamSchema, 'params'),
    validate(quotationUpdateSchema),
    QuotationController.update,
)
adminQuotationsRouter.delete(
    '/:id',
    requirePermission('quotations.manage'),
    validate(idParamSchema, 'params'),
    QuotationController.remove,
)
adminQuotationsRouter.post(
    '/:id/status',
    requirePermission('quotations.manage'),
    validate(idParamSchema, 'params'),
    validate(quotationStatusSchema),
    QuotationController.changeStatus,
)
adminQuotationsRouter.post(
    '/:id/pdf',
    requirePermission('quotations.manage'),
    validate(idParamSchema, 'params'),
    QuotationController.generatePdf,
)
adminQuotationsRouter.get(
    '/:id/pdf',
    requirePermission('quotations.view'),
    validate(idParamSchema, 'params'),
    QuotationController.downloadPdf,
)
adminQuotationsRouter.get(
    '/:id/shares',
    requirePermission('quotations.view'),
    validate(idParamSchema, 'params'),
    QuotationController.listShares,
)
adminQuotationsRouter.post(
    '/:id/shares',
    requirePermission('quotations.share'),
    validate(idParamSchema, 'params'),
    validate(quotationShareCreateSchema),
    QuotationController.createShare,
)
adminQuotationsRouter.post(
    '/shares/:id/revoke',
    requirePermission('quotations.share'),
    validate(idParamSchema, 'params'),
    QuotationController.revokeShare,
)
adminQuotationsRouter.post(
    '/:id/convert',
    requirePermission('quotations.manage'),
    validate(idParamSchema, 'params'),
    QuotationController.convert,
)

export const publicQuotationSharesRouter = Router()

publicQuotationSharesRouter.get(
    '/:token',
    validate(shareTokenParamSchema, 'params'),
    QuotationController.lookupShare,
)
publicQuotationSharesRouter.get(
    '/:token/pdf',
    validate(shareTokenParamSchema, 'params'),
    QuotationController.downloadSharePdf,
)
