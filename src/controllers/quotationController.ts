import type { Request, Response } from 'express'

import { attachmentDisposition } from '../lib/storage.js'
import { parseQuery } from '../middleware/validate.js'
import {
    quotationListSchema,
    quotationShareCreateSchema,
    quotationStatusSchema,
} from '../schemas/index.js'
import QuotationService from '../services/quotationService.js'

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

class QuotationController {
    async list(req: Request, res: Response) {
        res.json(await QuotationService.list(parseQuery(quotationListSchema, req.query)))
    }

    async get(req: Request, res: Response) {
        res.json(await QuotationService.get(String(req.params.id)))
    }

    async create(req: Request, res: Response) {
        res.status(201).json(await QuotationService.create(req.user!, req.body))
    }

    async update(req: Request, res: Response) {
        res.json(await QuotationService.update(req.user!, String(req.params.id), req.body))
    }

    async changeStatus(req: Request, res: Response) {
        const body = quotationStatusSchema.parse(req.body)
        res.json(await QuotationService.changeStatus(req.user!, String(req.params.id), body))
    }

    async generatePdf(req: Request, res: Response) {
        res.json(await QuotationService.generatePdf(req.user!, String(req.params.id)))
    }

    async downloadPdf(req: Request, res: Response) {
        pipeDownload(res, await QuotationService.openPdf(String(req.params.id)))
    }

    async listShares(req: Request, res: Response) {
        res.json(await QuotationService.listShares(String(req.params.id)))
    }

    async createShare(req: Request, res: Response) {
        const body = quotationShareCreateSchema.parse(req.body)
        res.status(201).json(await QuotationService.createShare(req.user!, String(req.params.id), body))
    }

    async revokeShare(req: Request, res: Response) {
        res.json(await QuotationService.revokeShare(req.user!, String(req.params.id)))
    }

    async convert(req: Request, res: Response) {
        res.json(await QuotationService.convert(req.user!, String(req.params.id)))
    }

    async remove(req: Request, res: Response) {
        res.json(await QuotationService.remove(req.user!, String(req.params.id)))
    }

    async lookupShare(req: Request, res: Response) {
        res.json(await QuotationService.lookupShare(String(req.params.token)))
    }

    async downloadSharePdf(req: Request, res: Response) {
        pipeDownload(res, await QuotationService.openSharePdf(String(req.params.token)))
    }
}

export default new QuotationController()
