import type { UserRole } from '../generated/prisma/client.js'

export const CAPABILITIES = [
    'content.edit',
    'clients.view',
    'clients.edit',
    'team.view',
    'business.edit',
] as const

export type Capability = (typeof CAPABILITIES)[number]

/** Roles whose capabilities the super admin can configure. Super admins always hold every capability. */
export const CONFIGURABLE_ROLES = ['STAFF', 'ADMIN'] as const

export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number]

export type RolePermissions = Record<ConfigurableRole, Capability[]>

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
    STAFF: ['content.edit', 'clients.view', 'clients.edit'],
    ADMIN: ['content.edit', 'clients.view', 'clients.edit', 'team.view', 'business.edit'],
}

export function capabilitiesFor(role: UserRole, matrix: RolePermissions): Capability[] {
    if (role === 'SUPER_ADMIN') return [...CAPABILITIES]
    if (role === 'STAFF' || role === 'ADMIN') return matrix[role]
    return []
}

const ROLE_RANK: Record<UserRole, number> = { CUSTOMER: 0, STAFF: 1, ADMIN: 2, SUPER_ADMIN: 3 }

export function isPromotion(from: UserRole, to: UserRole) {
    return ROLE_RANK[to] > ROLE_RANK[from]
}

export const TEAM_ROLES: UserRole[] = ['STAFF', 'ADMIN', 'SUPER_ADMIN']
