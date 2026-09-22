import { Router } from 'express'
import multer from 'multer'

import UploadController from '../controllers/uploadController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const router = Router()

router.post(
  '/',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  upload.single('file'),
  (req, res, next) => {
    void UploadController.create(req, res).catch(next)
  },
)

export default router
