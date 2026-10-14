import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { adminUserListSchema } from '../schemas/index.js'
import UserService from '../services/userService.js'

class AdminUserController {
    async list(req: Request, res: Response) {
        const parsed = adminUserListSchema.safeParse(req.query)
        if (!parsed.success) {
            throw new AppError(
                400,
                'VALIDATION_ERROR',
                parsed.error.issues.map((issue) => issue.message).join('; ') || 'Invalid query',
            )
        }
        res.json(await UserService.list(parsed.data))
    }

    async getById(req: Request, res: Response) {
        const user = await UserService.getById(String(req.params.id))
        res.json({ user })
    }

    async updateById(req: Request, res: Response) {
        const user = await UserService.updateById(String(req.params.id), req.body)
        res.json({ user })
    }

    async setRole(req: Request, res: Response) {
        const user = await UserService.setRole(req.user!.id, String(req.params.id), req.body)
        res.json({ user })
    }
}

export default new AdminUserController()
