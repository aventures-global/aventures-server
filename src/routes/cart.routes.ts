import { Router } from 'express'

import CartController from '../controllers/cartController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import {
    cartAddSchema,
    cartUpdateSchema,
    idParamSchema,
} from '../schemas/index.js'

const router = Router()

router.use(requireAuth)

router.get('/', CartController.list)
router.post('/items', validate(cartAddSchema), CartController.addItem)
router.patch('/items/:id', validate(idParamSchema, 'params'), validate(cartUpdateSchema), CartController.updateItem)
router.delete('/items/:id', validate(idParamSchema, 'params'), CartController.removeItem)
router.delete('/', CartController.clear)

export default router
