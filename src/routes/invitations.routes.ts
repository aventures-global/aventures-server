import { Router } from 'express'

import InvitationController from '../controllers/invitationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission, requireSuperAdmin } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { idParamSchema, invitationCreateSchema, invitationTokenSchema } from '../schemas/index.js'

/** Mounted at `/admin/invitations`. */
export const adminInvitationsRouter = Router()

adminInvitationsRouter.get('/', requireAuth, requirePermission('team.view'), InvitationController.list)
adminInvitationsRouter.post('/', requireAuth, requireSuperAdmin, validate(invitationCreateSchema), InvitationController.create)
adminInvitationsRouter.post(
    '/:id/revoke',
    requireAuth,
    requireSuperAdmin,
    validate(idParamSchema, 'params'),
    InvitationController.revoke,
)

/**
 * Mounted at `/invitations`. The emailed token is the credential, because invited customers
 * cannot sign in to the admin site until they accept.
 */
export const publicInvitationsRouter = Router()

publicInvitationsRouter.post('/lookup', validate(invitationTokenSchema), InvitationController.lookup)
publicInvitationsRouter.post('/accept', validate(invitationTokenSchema), InvitationController.accept)
