import type { Request, Response } from 'express'

import { parseQuery } from '../middleware/validate.js'
import { bookingListSchema } from '../schemas/index.js'
import BookingService from '../services/bookingService.js'

class BookingController {
    async list(req: Request, res: Response) {
        res.json(await BookingService.list(parseQuery(bookingListSchema, req.query)))
    }

    async get(req: Request, res: Response) {
        res.json(await BookingService.get(String(req.params.id)))
    }

    async update(req: Request, res: Response) {
        res.json(await BookingService.update(req.user!, String(req.params.id), req.body))
    }
}

export default new BookingController()
