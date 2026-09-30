import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

class MerchRepository {
    async findAll() {
        return prisma.merchProduct.findMany({ orderBy: { name: 'asc' } })
    }

    async findBySlug(slug: string) {
        return prisma.merchProduct.findUnique({ where: { slug } })
    }

    async findById(id: string) {
        return prisma.merchProduct.findUnique({ where: { id } })
    }

    async create(data: Prisma.MerchProductCreateInput) {
        return prisma.merchProduct.create({ data })
    }

    async updateBySlug(slug: string, data: Prisma.MerchProductUpdateInput) {
        return prisma.merchProduct.update({ where: { slug }, data })
    }

    async deleteBySlug(slug: string) {
        return prisma.merchProduct.delete({ where: { slug } })
    }
}

export default new MerchRepository()
