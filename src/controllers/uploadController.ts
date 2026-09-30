import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import UploadService from '../services/uploadService.js'

class UploadController {
    async create(req: Request, res: Response) {
        const file = req.file

        if (!file) {
            throw new AppError(400, 'MISSING_FILE', 'File is required')
        }

        const result = await UploadService.create({
            buffer: file.buffer,
            mimeType: file.mimetype,
            folder: typeof req.body?.folder === 'string' ? req.body.folder : 'uploads',
        })
        res.status(201).json(result)
    }
}

export default new UploadController()
