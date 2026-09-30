import type { Request, Response } from 'express'

import TestimonialService from '../services/testimonialService.js'

class TestimonialController {
    async list(_req: Request, res: Response) {
        const items = await TestimonialService.list()
        res.json(items)
    }

    async create(req: Request, res: Response) {
        const item = await TestimonialService.create(req.body)
        res.status(201).json(item)
    }

    async updateById(req: Request, res: Response) {
        const item = await TestimonialService.updateById(String(req.params.id), req.body)
        res.json(item)
    }

    async deleteById(req: Request, res: Response) {
        await TestimonialService.deleteById(String(req.params.id))
        res.status(204).send()
    }
}

export default new TestimonialController()
