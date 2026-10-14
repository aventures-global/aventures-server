import type { Request, Response } from 'express'

import { parseQuery } from '../middleware/validate.js'
import { invitationListSchema } from '../schemas/index.js'
import InvitationService from '../services/invitationService.js'

class InvitationController {
    async list(req: Request, res: Response) {
        res.json(await InvitationService.list(parseQuery(invitationListSchema, req.query)))
    }

    async create(req: Request, res: Response) {
        res.status(201).json(await InvitationService.create(req.user!.id, req.body))
    }

    async revoke(req: Request, res: Response) {
        res.json(await InvitationService.revoke(req.user!.id, String(req.params.id)))
    }

    async lookup(req: Request, res: Response) {
        res.json(await InvitationService.lookup(req.body.token))
    }

    async accept(req: Request, res: Response) {
        res.json(await InvitationService.accept(req.body.token))
    }
}

export default new InvitationController()
