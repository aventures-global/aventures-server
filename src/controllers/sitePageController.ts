import type { Request, Response } from 'express'

import type { SitePageId } from '../lib/sitePageContent.js'
import SitePageService from '../services/sitePageService.js'

class SitePageController {
    async get(req: Request, res: Response) {
        res.json(await SitePageService.get(req.params.id as SitePageId))
    }

    async replace(req: Request, res: Response) {
        res.json(await SitePageService.replace(req.params.id as SitePageId, req.body))
    }
}

export default new SitePageController()
