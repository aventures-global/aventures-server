import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { getNeonRole, isNeonAdminRole } from '../lib/neonAuth.js'
import UserService from '../services/userService.js'

class MeController {
    async bootstrap(req: Request, res: Response) {
        const userId = req.auth?.userId

        if (!userId) {
            throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
        }

        const neonRole = req.auth?.neonRole ?? (await getNeonRole(userId))
        const user = await UserService.bootstrap(userId, req.body ?? {}, {
            neonAdmin: isNeonAdminRole(neonRole),
        })
        res.json({ user })
    }

    async getMe(req: Request, res: Response) {
        const userId = req.auth?.userId

        if (!userId) {
            throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
        }

        const user = await UserService.getMe(userId)
        res.json({ user })
    }

    async updateMe(req: Request, res: Response) {
        const userId = req.auth?.userId

        if (!userId) {
            throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
        }

        const user = await UserService.updateMe(userId, req.body)
        res.json({ user })
    }
}

export default new MeController()
