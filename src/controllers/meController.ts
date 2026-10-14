import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { getNeonRole, isNeonAdminRole } from '../lib/neonAuth.js'
import PermissionService from '../services/permissionService.js'
import PreferenceService from '../services/preferenceService.js'
import UserService from '../services/userService.js'

function requireUserId(req: Request) {
    const userId = req.auth?.userId
    if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    return userId
}

class MeController {
    async bootstrap(req: Request, res: Response) {
        const userId = requireUserId(req)
        const neonRole = req.auth?.neonRole ?? (await getNeonRole(userId))
        const user = await UserService.bootstrap(userId, req.body ?? {}, {
            neonAdmin: isNeonAdminRole(neonRole),
        })
        res.json({ user, permissions: await PermissionService.capabilitiesFor(user.role) })
    }

    async getMe(req: Request, res: Response) {
        const user = await UserService.getMe(requireUserId(req))
        res.json({ user })
    }

    async updateMe(req: Request, res: Response) {
        const user = await UserService.updateMe(requireUserId(req), req.body)
        res.json({ user })
    }

    async getPreferences(req: Request, res: Response) {
        res.json(await PreferenceService.get(requireUserId(req)))
    }

    async updatePreferences(req: Request, res: Response) {
        const userId = requireUserId(req)
        await UserService.getMe(userId)
        res.json(await PreferenceService.update(userId, req.body))
    }
}

export default new MeController()
