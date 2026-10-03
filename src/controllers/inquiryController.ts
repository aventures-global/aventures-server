import type { Request, Response } from 'express'

import InquiryService from '../services/inquiryService.js'

class InquiryController {
    async create(req: Request, res: Response) {
        await InquiryService.send(req.body)
        res.json({ ok: true })
    }
}

export default new InquiryController()
