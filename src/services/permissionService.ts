import type { UserRole } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import {
    CAPABILITIES,
    DEFAULT_ROLE_PERMISSIONS,
    capabilitiesFor,
    type Capability,
    type RolePermissions,
} from '../lib/permissions.js'
import AppSettingRepository from '../repositories/appSettingRepository.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import { rolePermissionsSchema } from '../schemas/index.js'

function normalize(matrix: z.infer<typeof rolePermissionsSchema>): RolePermissions {
    const keep = (list: Capability[]) => CAPABILITIES.filter((cap) => list.includes(cap))
    return { STAFF: keep(matrix.STAFF), ADMIN: keep(matrix.ADMIN) }
}

class PermissionService {
    async getMatrix(): Promise<RolePermissions> {
        const stored = rolePermissionsSchema.safeParse(await AppSettingRepository.findValue('role-permissions'))
        return stored.success ? normalize(stored.data) : DEFAULT_ROLE_PERMISSIONS
    }

    async updateMatrix(actorId: string, input: z.infer<typeof rolePermissionsSchema>) {
        const matrix = normalize(input)
        await AppSettingRepository.upsert('role-permissions', matrix)
        await AuditLogRepository.create({
            actorId,
            subjectUserId: null,
            action: 'role_permissions.updated',
            metadata: matrix,
        })
        return matrix
    }

    async capabilitiesFor(role: UserRole) {
        return capabilitiesFor(role, await this.getMatrix())
    }

    async assert(role: UserRole, capability: Capability) {
        if (!(await this.capabilitiesFor(role)).includes(capability)) {
            throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions')
        }
    }
}

export default new PermissionService()
