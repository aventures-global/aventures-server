import type { Prisma } from '../generated/prisma/client.js'

import { MERCH_INCLUDE } from '../lib/mappers.js'
import { prisma } from '../lib/prisma.js'

class MerchRepository {
    async findAll() {
        return prisma.merchProduct.findMany({
            include: MERCH_INCLUDE,
            orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
        })
    }

    async findBySlug(slug: string) {
        return prisma.merchProduct.findUnique({ where: { slug }, include: MERCH_INCLUDE })
    }

    async findById(id: string) {
        return prisma.merchProduct.findUnique({ where: { id }, include: MERCH_INCLUDE })
    }

    async create(data: Prisma.MerchProductUncheckedCreateInput) {
        return prisma.merchProduct.create({ data, include: MERCH_INCLUDE })
    }

    async updateBySlug(slug: string, data: Prisma.MerchProductUncheckedUpdateInput) {
        return prisma.merchProduct.update({ where: { slug }, data, include: MERCH_INCLUDE })
    }

    async deleteBySlug(slug: string) {
        return prisma.merchProduct.delete({ where: { slug } })
    }
}

export default new MerchRepository()
