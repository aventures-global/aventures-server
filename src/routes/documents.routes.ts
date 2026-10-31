import { Router } from 'express'
import multer from 'multer'

import DocumentController from '../controllers/documentController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireStaff } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import {
    fileUpdateSchema,
    folderCreateSchema,
    folderRenameSchema,
    idParamSchema,
    shareTokenParamSchema,
} from '../schemas/index.js'

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
})

export const adminDocumentsRouter = Router()

adminDocumentsRouter.use(requireAuth, requireStaff)

adminDocumentsRouter.get('/', requirePermission('documents.view'), DocumentController.browse)

adminDocumentsRouter.post(
    '/folders',
    requirePermission('documents.manage'),
    validate(folderCreateSchema),
    DocumentController.createFolder,
)
adminDocumentsRouter.patch(
    '/folders/:id',
    requirePermission('documents.manage'),
    validate(idParamSchema, 'params'),
    validate(folderRenameSchema),
    DocumentController.renameFolder,
)
adminDocumentsRouter.delete(
    '/folders/:id',
    requirePermission('documents.manage'),
    validate(idParamSchema, 'params'),
    DocumentController.deleteFolder,
)

adminDocumentsRouter.post(
    '/files',
    requirePermission('documents.manage'),
    upload.single('file'),
    DocumentController.upload,
)
adminDocumentsRouter.patch(
    '/files/:id',
    requirePermission('documents.manage'),
    validate(idParamSchema, 'params'),
    validate(fileUpdateSchema),
    DocumentController.updateFile,
)
adminDocumentsRouter.delete(
    '/files/:id',
    requirePermission('documents.manage'),
    validate(idParamSchema, 'params'),
    DocumentController.deleteFile,
)
adminDocumentsRouter.get(
    '/files/:id/download',
    requirePermission('documents.view'),
    validate(idParamSchema, 'params'),
    DocumentController.downloadFile,
)

adminDocumentsRouter.get(
    '/files/:id/shares',
    requirePermission('documents.view'),
    validate(idParamSchema, 'params'),
    DocumentController.listShares,
)
adminDocumentsRouter.post(
    '/files/:id/shares',
    requirePermission('documents.share'),
    validate(idParamSchema, 'params'),
    DocumentController.createShare,
)
adminDocumentsRouter.post(
    '/shares/:id/revoke',
    requirePermission('documents.share'),
    validate(idParamSchema, 'params'),
    DocumentController.revokeShare,
)

export const publicDocumentSharesRouter = Router()

publicDocumentSharesRouter.get(
    '/:token',
    validate(shareTokenParamSchema, 'params'),
    DocumentController.lookupShare,
)
publicDocumentSharesRouter.get(
    '/:token/download',
    validate(shareTokenParamSchema, 'params'),
    DocumentController.downloadShare,
)
