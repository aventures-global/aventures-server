import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

class TourRepository {
    async findAll() {
        return prisma.tour.findMany({ orderBy: { title: 'asc' } })
    }

    async findFeatured() {
        return prisma.tour.findMany({
            where: { featured: true },
            orderBy: { title: 'asc' },
        })
    }

    async findBySlug(slug: string) {
        return prisma.tour.findUnique({ where: { slug } })
    }

    async create(data: Prisma.TourCreateInput) {
        return prisma.tour.create({ data })
    }

    async updateBySlug(slug: string, data: Prisma.TourUpdateInput) {
        return prisma.tour.update({ where: { slug }, data })
    }

    async deleteBySlug(slug: string) {
        return prisma.tour.delete({ where: { slug } })
    }
}

export default new TourRepository()
