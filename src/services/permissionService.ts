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

/**
 * Matrices saved before documents.* / quotations.* existed omit those caps.
 * Seed defaults only when neither configurable role has any of that prefix yet.
 */
function withCapabilityDefaults(matrix: RolePermissions, prefix: string): RolePermissions {
    const hasPrefix = (role: keyof RolePermissions) => matrix[role].some((cap) => cap.startsWith(prefix))
    if (hasPrefix('STAFF') || hasPrefix('ADMIN')) return matrix

    const merge = (role: keyof RolePermissions) => {
        const extras = DEFAULT_ROLE_PERMISSIONS[role].filter((cap) => cap.startsWith(prefix))
        return extras.length ? [...matrix[role], ...extras] : matrix[role]
    }
    return { STAFF: merge('STAFF'), ADMIN: merge('ADMIN') }
}

class PermissionService {
    async getMatrix(): Promise<RolePermissions> {
        const stored = rolePermissionsSchema.safeParse(await AppSettingRepository.findValue('role-permissions'))
        if (!stored.success) return DEFAULT_ROLE_PERMISSIONS
        const normalized = normalize(stored.data)
        const withDocs = withCapabilityDefaults(normalized, 'documents.')
        const withQuotes = withCapabilityDefaults(withDocs, 'quotations.')
        const withPayments = withCapabilityDefaults(withQuotes, 'payments.')
        const merged = withCapabilityDefaults(withPayments, 'finance.')
        if (merged !== normalized) {
            await AppSettingRepository.upsert('role-permissions', merged)
        }
        return merged
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
