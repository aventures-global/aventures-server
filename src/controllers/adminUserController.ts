import type { Request, Response } from 'express'

import { parseQuery } from '../middleware/validate.js'
import { adminUserListSchema, pageQuerySchema } from '../schemas/index.js'
import UserService from '../services/userService.js'

class AdminUserController {
    async list(req: Request, res: Response) {
        res.json(await UserService.list(req.user!, parseQuery(adminUserListSchema, req.query)))
    }

    async getById(req: Request, res: Response) {
        const user = await UserService.getById(req.user!, String(req.params.id))
        res.json({ user })
    }

    async updateById(req: Request, res: Response) {
        const user = await UserService.updateById(req.user!, String(req.params.id), req.body)
        res.json({ user })
    }

    async setRole(req: Request, res: Response) {
        const user = await UserService.setRole(req.user!.id, String(req.params.id), req.body)
        res.json({ user })
    }

    async activity(req: Request, res: Response) {
        res.json(
            await UserService.activity(req.user!, String(req.params.id), parseQuery(pageQuerySchema, req.query)),
        )
    }
}

export default new AdminUserController()
