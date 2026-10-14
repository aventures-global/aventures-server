import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

class PreferenceRepository {
    async findByUserId(userId: string) {
        return prisma.userPreference.findUnique({ where: { userId } })
    }

    async upsert(userId: string, data: Omit<Prisma.UserPreferenceUncheckedCreateInput, 'userId'>) {
        return prisma.userPreference.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        })
    }
}

export default new PreferenceRepository()
