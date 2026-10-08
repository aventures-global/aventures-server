import type { Request, Response } from 'express'

import PartnerService from '../services/partnerService.js'

class PartnerController {
    async list(_req: Request, res: Response) {
        const partners = await PartnerService.list()
        res.json(partners)
    }

    async create(req: Request, res: Response) {
        const partner = await PartnerService.create(req.body)
        res.status(201).json(partner)
    }

    async updateById(req: Request, res: Response) {
        const partner = await PartnerService.updateById(String(req.params.id), req.body)
        res.json(partner)
    }

    async reorder(req: Request, res: Response) {
        await PartnerService.reorder(req.body)
        res.status(204).send()
    }

    async deleteById(req: Request, res: Response) {
        await PartnerService.deleteById(String(req.params.id))
        res.status(204).send()
    }
}

export default new PartnerController()
