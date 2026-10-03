import type { Request, Response } from 'express'

import FaqService from '../services/faqService.js'

class FaqController {
    async listPublic(_req: Request, res: Response) {
        res.json(await FaqService.listPublic())
    }

    async listAdmin(_req: Request, res: Response) {
        res.json(await FaqService.listAdmin())
    }

    async createCategory(req: Request, res: Response) {
        res.status(201).json(await FaqService.createCategory(req.body))
    }

    async updateCategory(req: Request, res: Response) {
        res.json(await FaqService.updateCategory(String(req.params.id), req.body))
    }

    async deleteCategory(req: Request, res: Response) {
        await FaqService.deleteCategory(String(req.params.id))
        res.status(204).send()
    }

    async reorderCategories(req: Request, res: Response) {
        await FaqService.reorderCategories(req.body)
        res.status(204).send()
    }

    async createFaq(req: Request, res: Response) {
        res.status(201).json(await FaqService.createFaq(req.body))
    }

    async updateFaq(req: Request, res: Response) {
        res.json(await FaqService.updateFaq(String(req.params.id), req.body))
    }

    async deleteFaq(req: Request, res: Response) {
        await FaqService.deleteFaq(String(req.params.id))
        res.status(204).send()
    }

    async addTop(req: Request, res: Response) {
        await FaqService.addTop(req.body.faqId)
        res.status(204).send()
    }

    async removeTop(req: Request, res: Response) {
        await FaqService.removeTop(String(req.params.id))
        res.status(204).send()
    }
}

export default new FaqController()
