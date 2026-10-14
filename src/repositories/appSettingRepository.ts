import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

export type AppSettingId = 'business' | 'role-permissions'

class AppSettingRepository {
    async findValue(id: AppSettingId) {
        const row = await prisma.appSetting.findUnique({ where: { id } })
        return row?.value ?? null
    }

    async upsert(id: AppSettingId, value: unknown) {
        const json = value as Prisma.InputJsonValue
        return prisma.appSetting.upsert({
            where: { id },
            create: { id, value: json },
            update: { value: json },
        })
    }
}

export default new AppSettingRepository()
