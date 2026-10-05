import type { Request, Response } from 'express'

import MerchCategoryService from '../services/merchCategoryService.js'
import MerchService from '../services/merchService.js'

class MerchController {
    async list(_req: Request, res: Response) {
        const products = await MerchService.list()
        res.json(products)
    }

    async getBySlug(req: Request, res: Response) {
        const product = await MerchService.getBySlug(String(req.params.slug))
        res.json(product)
    }

    async create(req: Request, res: Response) {
        const product = await MerchService.create(req.body)
        res.status(201).json(product)
    }

    async updateBySlug(req: Request, res: Response) {
        const product = await MerchService.updateBySlug(String(req.params.slug), req.body)
        res.json(product)
    }

    async deleteBySlug(req: Request, res: Response) {
        await MerchService.deleteBySlug(String(req.params.slug))
        res.status(204).send()
    }

    async listCategories(_req: Request, res: Response) {
        res.json(await MerchCategoryService.list())
    }

    async createCategory(req: Request, res: Response) {
        res.status(201).json(await MerchCategoryService.create(req.body))
    }

    async renameCategory(req: Request, res: Response) {
        res.json(await MerchCategoryService.rename(String(req.params.id), req.body))
    }

    async deleteCategory(req: Request, res: Response) {
        await MerchCategoryService.delete(String(req.params.id))
        res.status(204).send()
    }

    async reorderCategories(req: Request, res: Response) {
        await MerchCategoryService.reorder(req.body)
        res.status(204).send()
    }
}

export default new MerchController()
