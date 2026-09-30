import type { User } from '../generated/prisma/client.js'
import type { z } from 'zod'

import type { BootstrapSeed } from '../repositories/userRepository.js'
import UserRepository from '../repositories/userRepository.js'
import type { bootstrapSchema, updateMeSchema } from '../schemas/index.js'

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

function adminEmails(): Set<string> {
    const raw = process.env.ADMIN_EMAILS ?? ''
    return new Set(
        raw
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
    )
}

class UserService {
    async bootstrap(userId: string, seed: z.infer<typeof bootstrapSchema> = {}) {
        const profile: BootstrapSeed = {
            email: seed.email ?? null,
            firstName: seed.firstName ?? null,
            lastName: seed.lastName ?? null,
            profilePicture: seed.profilePicture ?? null,
        }

        let user = await UserRepository.upsert(userId, profile)
        user = (await UserRepository.fillNullFields(userId, profile)) ?? user

        const email = user.email?.toLowerCase()
        if (email && adminEmails().has(email) && user.role !== 'ADMIN') {
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
}

export default new UserService()
