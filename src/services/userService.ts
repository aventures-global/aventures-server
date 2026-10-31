import type { Prisma, User, UserRole } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { TEAM_ROLES, isPromotion } from '../lib/permissions.js'
import { deletePublicUrl } from '../lib/storage.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import type { BootstrapSeed } from '../repositories/userRepository.js'
import UserRepository from '../repositories/userRepository.js'
import type {
    adminUserListSchema,
    adminUserRoleSchema,
    adminUserUpdateSchema,
    bootstrapSchema,
    pageQuerySchema,
    updateMeSchema,
} from '../schemas/index.js'
import PermissionService from './permissionService.js'

export type Actor = { id: string; role: UserRole }

function serializeUser(user: User) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePicture: user.profilePicture,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }
}

function emailSet(raw = ''): Set<string> {
    return new Set(
        raw
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
    )
}

function isTeamMember(user: User) {
    return TEAM_ROLES.includes(user.role)
}

class UserService {
    async bootstrap(
        userId: string,
        seed: z.infer<typeof bootstrapSchema> = {},
        options: { neonAdmin?: boolean } = {},
    ) {
        const profile: BootstrapSeed = {
            email: seed.email ?? null,
            firstName: seed.firstName ?? null,
            lastName: seed.lastName ?? null,
            profilePicture: seed.profilePicture ?? null,
        }

        const isNew = !(await UserRepository.findById(userId))
        let user = await UserRepository.upsert(userId, profile)
        user = (await UserRepository.fillNullFields(userId, profile)) ?? user

        const email = user.email?.toLowerCase()
        if (email && emailSet(process.env.SUPER_ADMIN_EMAILS).has(email)) {
            if (user.role !== 'SUPER_ADMIN') {
                user = await UserRepository.setRole(userId, 'SUPER_ADMIN')
            }
        } else if (user.role === 'SUPER_ADMIN') {
            // Super admin is env-only; removing the email from SUPER_ADMIN_EMAILS revokes it.
            user = await UserRepository.setRole(userId, 'ADMIN')
        } else if (
            isNew &&
            (options.neonAdmin || (email ? emailSet(process.env.ADMIN_EMAILS).has(email) : false))
        ) {
            // First login only, so a super admin's later demotion is not undone on next login.
            user = await UserRepository.setRole(userId, 'ADMIN')
        }

        return serializeUser(user)
    }

    async getMe(userId: string) {
        return this.bootstrap(userId)
    }

    async updateMe(userId: string, input: z.infer<typeof updateMeSchema>) {
        await this.bootstrap(userId)
        if (input.profilePicture !== undefined) {
            const current = await UserRepository.findById(userId)
            const previous = current?.profilePicture
            if (previous && previous !== input.profilePicture) {
                await deletePublicUrl(previous)
            }
        }
        const user = await UserRepository.updateProfile(userId, input)
        return serializeUser(user)
    }

    async list(actor: Actor, input: z.infer<typeof adminUserListSchema>) {
        if (input.scope === 'all') {
            if (actor.role !== 'SUPER_ADMIN') throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions')
        } else {
            await PermissionService.assert(actor.role, input.scope === 'team' ? 'team.view' : 'clients.view')
        }

        const scopeRoles: UserRole[] | null =
            input.scope === 'team' ? TEAM_ROLES : input.scope === 'customers' ? ['CUSTOMER'] : null
        const roles = input.role === 'all' ? scopeRoles : scopeRoles && !scopeRoles.includes(input.role) ? [] : [input.role]

        const where: Prisma.UserWhereInput = {
            ...(roles ? { role: { in: roles } } : {}),
            ...(input.q
                ? {
                      OR: (['email', 'firstName', 'lastName', 'phone'] as const).map((field) => ({
                          [field]: { contains: input.q, mode: 'insensitive' as const },
                      })),
                  }
                : {}),
        }
        const [users, total] = await UserRepository.findMany({
            where,
            orderBy: { [input.sort]: input.dir },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
        })
        return {
            items: users.map(serializeUser),
            total,
            page: input.page,
            limit: input.limit,
        }
    }

    async getById(actor: Actor, id: string) {
        return serializeUser(await this.requireViewable(actor, id))
    }

    async updateById(actor: Actor, id: string, input: z.infer<typeof adminUserUpdateSchema>) {
        const user = await this.requireUser(id)
        if (isTeamMember(user)) {
            if (actor.role !== 'SUPER_ADMIN') {
                throw new AppError(403, 'FORBIDDEN', 'Only the super admin can edit team member profiles')
            }
        } else {
            await PermissionService.assert(actor.role, 'clients.edit')
        }

        const updated = await UserRepository.updateProfile(id, input)
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: id,
            action: 'profile.updated',
            metadata: { fields: Object.keys(input) },
        })
        return serializeUser(updated)
    }

    /** Lowers a role immediately. Promotions go through an emailed invitation instead. */
    async setRole(actorId: string, id: string, input: z.infer<typeof adminUserRoleSchema>) {
        if (actorId === id) {
            throw new AppError(400, 'INVALID_ROLE_CHANGE', 'You cannot change your own role')
        }
        const user = await this.requireUser(id)
        if (user.role === 'SUPER_ADMIN') {
            throw new AppError(400, 'INVALID_ROLE_CHANGE', 'Super admin roles are managed by the server')
        }
        if (user.role === input.role) return serializeUser(user)
        if (isPromotion(user.role, input.role)) {
            throw new AppError(
                400,
                'INVITATION_REQUIRED',
                'Promotions need the person to accept an emailed invitation. Send an invitation instead.',
            )
        }

        const updated = await UserRepository.setRole(id, input.role)
        await AuditLogRepository.create({
            actorId,
            subjectUserId: id,
            action: 'role.changed',
            metadata: { from: user.role, to: input.role },
        })
        return serializeUser(updated)
    }

    async activity(actor: Actor, id: string, input: z.infer<typeof pageQuerySchema>) {
        await this.requireViewable(actor, id)
        const [entries, total] = await AuditLogRepository.findForUser(
            id,
            (input.page - 1) * input.limit,
            input.limit,
        )
        return {
            items: entries.map((entry) => ({
                id: entry.id,
                action: entry.action,
                metadata: entry.metadata,
                createdAt: entry.createdAt,
                actor: entry.actor,
                subjectUser: entry.subjectUser,
            })),
            total,
            page: input.page,
            limit: input.limit,
        }
    }

    private async requireViewable(actor: Actor, id: string) {
        const user = await this.requireUser(id)
        if (actor.id !== id) {
            await PermissionService.assert(actor.role, isTeamMember(user) ? 'team.view' : 'clients.view')
        }
        return user
    }

    private async requireUser(id: string) {
        const user = await UserRepository.findById(id)
        if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
        return user
    }
}

export default new UserService()
