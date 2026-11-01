import type { Request, Response } from 'express'

import { parseQuery } from '../middleware/validate.js'
import { paymentListSchema, paymentSummarySchema, paymentVoidSchema } from '../schemas/index.js'
import PaymentService from '../services/paymentService.js'

class PaymentController {
    async list(req: Request, res: Response) {
        res.json(await PaymentService.list(parseQuery(paymentListSchema, req.query)))
    }

    async get(req: Request, res: Response) {
        res.json(await PaymentService.get(String(req.params.id)))
    }

    async create(req: Request, res: Response) {
        res.status(201).json(await PaymentService.create(req.user!, req.body))
    }

    async update(req: Request, res: Response) {
        res.json(await PaymentService.update(req.user!, String(req.params.id), req.body))
    }

    async void(req: Request, res: Response) {
        const body = paymentVoidSchema.parse(req.body ?? {})
        res.json(await PaymentService.void(req.user!, String(req.params.id), body))
    }

    async summary(req: Request, res: Response) {
        res.json(await PaymentService.summary(parseQuery(paymentSummarySchema, req.query)))
    }

    async exportCsv(req: Request, res: Response) {
        const csv = await PaymentService.exportCsv(parseQuery(paymentListSchema, req.query))
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"')
        res.setHeader('Cache-Control', 'private, no-store')
        res.send(csv)
    }
}

export default new PaymentController()
