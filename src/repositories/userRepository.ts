import type { User, UserRole } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

export type BootstrapSeed = {
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    profilePicture?: string | null
}

class UserRepository {
    async findById(id: string) {
        return prisma.user.findUnique({ where: { id } })
    }

    async upsert(id: string, seed: BootstrapSeed) {
        return prisma.user.upsert({
            where: { id },
            create: {
                id,
                email: seed.email ?? null,
                firstName: seed.firstName ?? null,
                lastName: seed.lastName ?? null,
                profilePicture: seed.profilePicture ?? null,
                role: 'CUSTOMER',
            },
            update: {},
        })
    }

    async fillNullFields(id: string, seed: BootstrapSeed) {
        const user = await this.findById(id)
        if (!user) return null

        const data: Partial<User> = {}
        if (user.email == null && seed.email) data.email = seed.email
        if (user.firstName == null && seed.firstName) data.firstName = seed.firstName
        if (user.lastName == null && seed.lastName) data.lastName = seed.lastName
        if (user.profilePicture == null && seed.profilePicture) {
            data.profilePicture = seed.profilePicture
        }

        if (Object.keys(data).length === 0) return user

        return prisma.user.update({ where: { id }, data })
    }

    async setRole(id: string, role: UserRole) {
        return prisma.user.update({ where: { id }, data: { role } })
    }

    async updateProfile(
        id: string,
        input: {
            firstName?: string | null
            lastName?: string | null
            phone?: string | null
            profilePicture?: string | null
        },
    ) {
        return prisma.user.update({
            where: { id },
            data: {
                ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
                ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
                ...(input.phone !== undefined ? { phone: input.phone } : {}),
                ...(input.profilePicture !== undefined
                    ? { profilePicture: input.profilePicture }
                    : {}),
            },
        })
    }
}

export default new UserRepository()
