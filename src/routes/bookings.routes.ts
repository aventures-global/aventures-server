import { Router } from 'express'

import BookingController from '../controllers/bookingController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { bookingUpdateSchema, idParamSchema } from '../schemas/index.js'

export const adminBookingsRouter = Router()

adminBookingsRouter.use(requireAuth, requireStaff)

adminBookingsRouter.get('/', requirePermission('payments.view'), BookingController.list)
adminBookingsRouter.get(
    '/:id',
    requirePermission('payments.view'),
    validate(idParamSchema, 'params'),
    BookingController.get,
)
adminBookingsRouter.patch(
    '/:id',
    requirePermission('payments.manage'),
    validate(idParamSchema, 'params'),
    validate(bookingUpdateSchema),
    BookingController.update,
)
