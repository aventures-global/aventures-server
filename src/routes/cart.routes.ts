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

router.get('/', (req, res, next) => {
  void CartController.list(req, res).catch(next)
})

router.post('/items', validate(cartAddSchema), (req, res, next) => {
  void CartController.addItem(req, res).catch(next)
})

router.patch(
  '/items/:id',
  validate(idParamSchema, 'params'),
  validate(cartUpdateSchema),
  (req, res, next) => {
    void CartController.updateItem(req, res).catch(next)
  },
)

router.delete('/items/:id', validate(idParamSchema, 'params'), (req, res, next) => {
  void CartController.removeItem(req, res).catch(next)
})

router.delete('/', (req, res, next) => {
  void CartController.clear(req, res).catch(next)
})

export default router
