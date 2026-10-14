import type { Request, Response } from 'express'

import { CAPABILITIES } from '../lib/permissions.js'
import PermissionService from '../services/permissionService.js'
import SiteSettingService from '../services/siteSettingService.js'

class SettingsController {
    async getBusiness(_req: Request, res: Response) {
        res.json(await SiteSettingService.getBusiness())
    }

    async updateBusiness(req: Request, res: Response) {
        res.json(await SiteSettingService.updateBusiness(req.user!.id, req.body))
    }

    async getRoles(_req: Request, res: Response) {
        res.json({ capabilities: CAPABILITIES, roles: await PermissionService.getMatrix() })
    }

    async updateRoles(req: Request, res: Response) {
        res.json({ capabilities: CAPABILITIES, roles: await PermissionService.updateMatrix(req.user!.id, req.body) })
    }
}

export default new SettingsController()
