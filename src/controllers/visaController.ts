import type { Request, Response } from 'express'

import type { VisaId, VisaPageSlug } from '../lib/visaContent.js'
import VisaService from '../services/visaService.js'

class VisaController {
    async getCatalog(_req: Request, res: Response) {
        res.json(await VisaService.getCatalog())
    }

    async updatePage(req: Request, res: Response) {
        res.json(await VisaService.updatePage(req.params.slug as VisaPageSlug, req.body))
    }

    async updateService(req: Request, res: Response) {
        res.json(await VisaService.updateService(req.params.id as VisaId, req.body))
    }

    async updateFinder(req: Request, res: Response) {
        res.json(await VisaService.updateFinder(req.body))
    }
}

export default new VisaController()
