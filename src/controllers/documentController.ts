import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { attachmentDisposition } from '../lib/storage.js'
import { parseQuery } from '../middleware/validate.js'
import {
    documentListSchema,
    documentShareCreateSchema,
    FILE_SPACES,
    DOCUMENT_CATEGORIES,
} from '../schemas/index.js'
import DocumentService from '../services/documentService.js'
import type { DocumentCategory, FileSpace } from '../generated/prisma/client.js'

function pipeDownload(
    res: Response,
    result: {
        stream: NodeJS.ReadableStream
        contentType: string
        contentLength: number | undefined
        displayName: string
    },
) {
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', attachmentDisposition(result.displayName))
    if (result.contentLength != null) {
        res.setHeader('Content-Length', String(result.contentLength))
    }
    res.setHeader('Cache-Control', 'private, no-store')
    result.stream.pipe(res)
}

class DocumentController {
    async browse(req: Request, res: Response) {
        res.json(await DocumentService.browse(req.user!, parseQuery(documentListSchema, req.query)))
    }

    async createFolder(req: Request, res: Response) {
        const result = await DocumentService.createFolder(req.user!, req.body)
        res.status(201).json(result)
    }

    async renameFolder(req: Request, res: Response) {
        res.json(await DocumentService.renameFolder(req.user!, String(req.params.id), req.body.name))
    }

    async deleteFolder(req: Request, res: Response) {
        res.json(await DocumentService.deleteFolder(req.user!, String(req.params.id)))
    }

    async upload(req: Request, res: Response) {
        const file = req.file
        if (!file) throw new AppError(400, 'MISSING_FILE', 'File is required')

        const spaceRaw = typeof req.body?.space === 'string' ? req.body.space : ''
        if (!(FILE_SPACES as readonly string[]).includes(spaceRaw)) {
            throw new AppError(400, 'VALIDATION_ERROR', 'space must be CUSTOMER or INTERNAL')
        }

        const categoryRaw = typeof req.body?.category === 'string' ? req.body.category : undefined
        if (categoryRaw && !(DOCUMENT_CATEGORIES as readonly string[]).includes(categoryRaw)) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Invalid category')
        }

        const folderIdRaw = req.body?.folderId
        const folderId =
            folderIdRaw === undefined || folderIdRaw === '' || folderIdRaw === 'root' || folderIdRaw === 'null'
                ? null
                : String(folderIdRaw)

        const result = await DocumentService.upload(req.user!, {
            space: spaceRaw as FileSpace,
            ownerUserId: typeof req.body?.ownerUserId === 'string' ? req.body.ownerUserId : undefined,
            folderId,
            displayName: typeof req.body?.displayName === 'string' ? req.body.displayName : undefined,
            category: categoryRaw as DocumentCategory | undefined,
            notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
            file,
        })
        res.status(201).json(result)
    }

    async updateFile(req: Request, res: Response) {
        res.json(await DocumentService.updateFile(req.user!, String(req.params.id), req.body))
    }

    async deleteFile(req: Request, res: Response) {
        res.json(await DocumentService.deleteFile(req.user!, String(req.params.id)))
    }

    async downloadFile(req: Request, res: Response) {
        pipeDownload(res, await DocumentService.openDownload(req.user!, String(req.params.id)))
    }

    async createShare(req: Request, res: Response) {
        const body = documentShareCreateSchema.parse(req.body ?? {})
        const result = await DocumentService.createShare(req.user!, String(req.params.id), body)
        res.status(201).json(result)
    }

    async listShares(req: Request, res: Response) {
        res.json(await DocumentService.listShares(req.user!, String(req.params.id)))
    }

    async revokeShare(req: Request, res: Response) {
        res.json(await DocumentService.revokeShare(req.user!, String(req.params.id)))
    }

    async lookupShare(req: Request, res: Response) {
        res.json(await DocumentService.lookupShare(String(req.params.token)))
    }

    async downloadShare(req: Request, res: Response) {
        pipeDownload(res, await DocumentService.openShareDownload(String(req.params.token)))
    }
}

export default new DocumentController()
