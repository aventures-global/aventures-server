import { Router } from 'express'

import MeController from '../controllers/meController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { bootstrapSchema, updateMeSchema } from '../schemas/index.js'

const router = Router()

router.post(
  '/bootstrap',
  requireAuth,
  validate(bootstrapSchema),
  (req, res, next) => {
    void MeController.bootstrap(req, res).catch(next)
  },
)

router.get('/', requireAuth, (req, res, next) => {
  void MeController.getMe(req, res).catch(next)
})

router.patch('/', requireAuth, validate(updateMeSchema), (req, res, next) => {
  void MeController.updateMe(req, res).catch(next)
})

export default router
