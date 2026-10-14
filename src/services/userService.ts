import type { Prisma, User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import type { BootstrapSeed } from '../repositories/userRepository.js'
import UserRepository from '../repositories/userRepository.js'
import type {
    adminUserListSchema,
    adminUserRoleSchema,
    adminUserUpdateSchema,
    bootstrapSchema,
    updateMeSchema,
} from '../schemas/index.js'

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
        const user = await UserRepository.updateProfile(userId, input)
        return serializeUser(user)
    }

    async list(input: z.infer<typeof adminUserListSchema>) {
        const where: Prisma.UserWhereInput = {
            ...(input.role !== 'all' ? { role: input.role } : {}),
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

    async getById(id: string) {
        return serializeUser(await this.requireUser(id))
    }

    async updateById(id: string, input: z.infer<typeof adminUserUpdateSchema>) {
        await this.requireUser(id)
        return serializeUser(await UserRepository.updateProfile(id, input))
    }

    async setRole(actorId: string, id: string, input: z.infer<typeof adminUserRoleSchema>) {
        if (actorId === id) {
            throw new AppError(400, 'INVALID_ROLE_CHANGE', 'You cannot change your own role')
        }
        const user = await this.requireUser(id)
        if (user.role === 'SUPER_ADMIN') {
            throw new AppError(400, 'INVALID_ROLE_CHANGE', 'Super admin roles are managed by the server')
        }
        if (user.role === input.role) return serializeUser(user)
        return serializeUser(await UserRepository.setRole(id, input.role))
    }

    private async requireUser(id: string) {
        const user = await UserRepository.findById(id)
        if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
        return user
    }
}

export default new UserService()
