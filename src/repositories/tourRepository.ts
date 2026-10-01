import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const DISPLAY_ORDER: Prisma.TourOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { id: 'asc' }]

class TourRepository {
    async findAll() {
        return prisma.tour.findMany({ orderBy: DISPLAY_ORDER })
    }

    async findFeatured() {
        return prisma.tour.findMany({
            where: { featured: true },
            orderBy: DISPLAY_ORDER,
        })
    }

    async search(input: {
        where: Prisma.TourWhereInput
        orderBy: Prisma.TourOrderByWithRelationInput[]
        skip: number
        take: number
    }) {
        const [items, total] = await prisma.$transaction([
            prisma.tour.findMany(input),
            prisma.tour.count({ where: input.where }),
        ])
        return { items, total }
    }

    async findBySlug(slug: string) {
        return prisma.tour.findUnique({ where: { slug } })
    }

    async maxSortOrder() {
        const result = await prisma.tour.aggregate({ _max: { sortOrder: true } })
        return result._max.sortOrder ?? 0
    }

    /** The tour displayed immediately after (or before) `anchor`, ignoring `excludeId`. */
    async findNeighbor(
        anchor: { id: string; sortOrder: number },
        direction: 'after' | 'before',
        excludeId: string,
    ) {
        const after = direction === 'after'
        return prisma.tour.findFirst({
            where: {
                id: { not: excludeId },
                OR: [
                    { sortOrder: after ? { gt: anchor.sortOrder } : { lt: anchor.sortOrder } },
                    {
                        sortOrder: anchor.sortOrder,
                        id: after ? { gt: anchor.id } : { lt: anchor.id },
                    },
                ],
            },
            orderBy: after
                ? [{ sortOrder: 'asc' }, { id: 'asc' }]
                : [{ sortOrder: 'desc' }, { id: 'desc' }],
        })
    }

    async setSortOrder(slug: string, sortOrder: number) {
        return prisma.tour.update({ where: { slug }, data: { sortOrder } })
    }

    /** Rewrites every tour's sortOrder to 1..n, keeping the current order. */
    async renumber() {
        const tours = await prisma.tour.findMany({ orderBy: DISPLAY_ORDER, select: { id: true } })
        await prisma.$transaction(
            tours.map((tour, index) =>
                prisma.tour.update({ where: { id: tour.id }, data: { sortOrder: index + 1 } }),
            ),
        )
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
