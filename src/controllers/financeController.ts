import type { Request, Response } from 'express'

import { parseQuery } from '../middleware/validate.js'
import {
    financeEntryListSchema,
    financeEntryVoidSchema,
    financeSummarySchema,
} from '../schemas/index.js'
import FinanceService from '../services/financeService.js'

class FinanceController {
    async listCategories(req: Request, res: Response) {
        const includeArchived = req.query.includeArchived === 'true'
        res.json(await FinanceService.listCategories(includeArchived))
    }

    async createCategory(req: Request, res: Response) {
        res.status(201).json(await FinanceService.createCategory(req.user!, req.body))
    }

    async updateCategory(req: Request, res: Response) {
        res.json(await FinanceService.updateCategory(req.user!, String(req.params.id), req.body))
    }

    async listEntries(req: Request, res: Response) {
        res.json(await FinanceService.listEntries(parseQuery(financeEntryListSchema, req.query)))
    }

    async getEntry(req: Request, res: Response) {
        res.json(await FinanceService.getEntry(String(req.params.id)))
    }

    async createEntry(req: Request, res: Response) {
        res.status(201).json(await FinanceService.createEntry(req.user!, req.body))
    }

    async updateEntry(req: Request, res: Response) {
        res.json(await FinanceService.updateEntry(req.user!, String(req.params.id), req.body))
    }

    async voidEntry(req: Request, res: Response) {
        const body = financeEntryVoidSchema.parse(req.body ?? {})
        res.json(await FinanceService.voidEntry(req.user!, String(req.params.id), body))
    }

    async summary(req: Request, res: Response) {
        res.json(await FinanceService.summary(parseQuery(financeSummarySchema, req.query)))
    }
}

export default new FinanceController()
