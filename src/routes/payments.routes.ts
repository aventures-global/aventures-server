import { Router } from 'express'

import PaymentController from '../controllers/paymentController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    idParamSchema,
    paymentCreateSchema,
    paymentUpdateSchema,
    paymentVoidSchema,
} from '../schemas/index.js'

export const adminPaymentsRouter = Router()

adminPaymentsRouter.use(requireAuth, requireStaff)

adminPaymentsRouter.get('/', requirePermission('payments.view'), PaymentController.list)
adminPaymentsRouter.get('/summary', requirePermission('payments.view'), PaymentController.summary)
adminPaymentsRouter.get('/export.csv', requirePermission('payments.view'), PaymentController.exportCsv)
adminPaymentsRouter.post(
    '/',
    requirePermission('payments.manage'),
    validate(paymentCreateSchema),
    PaymentController.create,
)
adminPaymentsRouter.get(
    '/:id',
    requirePermission('payments.view'),
    validate(idParamSchema, 'params'),
    PaymentController.get,
)
adminPaymentsRouter.patch(
    '/:id',
    requirePermission('payments.manage'),
    validate(idParamSchema, 'params'),
    validate(paymentUpdateSchema),
    PaymentController.update,
)
adminPaymentsRouter.post(
    '/:id/void',
    requirePermission('payments.manage'),
    validate(idParamSchema, 'params'),
    validate(paymentVoidSchema),
    PaymentController.void,
)
