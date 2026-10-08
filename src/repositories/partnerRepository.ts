import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

class PartnerRepository {
    async findAll() {
        return prisma.partner.findMany({ orderBy: { sortOrder: 'asc' } })
    }

    async findById(id: string) {
        return prisma.partner.findUnique({ where: { id } })
    }

    async create(data: Prisma.PartnerCreateInput) {
        return prisma.partner.create({ data })
    }

    async updateById(id: string, data: Prisma.PartnerUpdateInput) {
        return prisma.partner.update({ where: { id }, data })
    }

    async deleteById(id: string) {
        return prisma.partner.delete({ where: { id } })
    }

    async nextSortOrder() {
        const { _max } = await prisma.partner.aggregate({ _max: { sortOrder: true } })
        return (_max.sortOrder ?? -1) + 1
    }

    async reorder(ids: string[]) {
        return prisma.$transaction(
            ids.map((id, index) =>
                prisma.partner.update({ where: { id }, data: { sortOrder: index } }),
            ),
        )
    }
}

export default new PartnerRepository()
