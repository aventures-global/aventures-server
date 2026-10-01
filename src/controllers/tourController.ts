import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { tourSearchSchema } from '../schemas/index.js'
import TourService from '../services/tourService.js'

class TourController {
    async list(_req: Request, res: Response) {
        const tours = await TourService.list()
        res.json(tours)
    }

    async listFeatured(_req: Request, res: Response) {
        const tours = await TourService.listFeatured()
        res.json(tours)
    }

    async search(req: Request, res: Response) {
        const parsed = tourSearchSchema.safeParse(req.query)
        if (!parsed.success) {
            throw new AppError(
                400,
                'VALIDATION_ERROR',
                parsed.error.issues.map((issue) => issue.message).join('; ') || 'Invalid query',
            )
        }
        res.json(await TourService.search(parsed.data))
    }

    async move(req: Request, res: Response) {
        const tour = await TourService.move(String(req.params.slug), req.body)
        res.json(tour)
    }

    async getBySlug(req: Request, res: Response) {
        const tour = await TourService.getBySlug(String(req.params.slug))
        res.json(tour)
    }

    async create(req: Request, res: Response) {
        const tour = await TourService.create(req.body)
        res.status(201).json(tour)
    }

    async updateBySlug(req: Request, res: Response) {
        const tour = await TourService.updateBySlug(String(req.params.slug), req.body)
        res.json(tour)
    }

    async deleteBySlug(req: Request, res: Response) {
        await TourService.deleteBySlug(String(req.params.slug))
        res.status(204).send()
    }
}

export default new TourController()
