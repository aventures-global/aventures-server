import { Router } from 'express'
import multer from 'multer'

import UploadController from '../controllers/uploadController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireStaff } from '../middleware/requireRole.js'

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
})

const router = Router()

router.post('/', requireAuth, requireStaff, upload.single('file'), UploadController.create)

export default router
