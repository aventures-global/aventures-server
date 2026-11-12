import type { Prisma } from '../generated/prisma/client.js'

import { TOUR_LIST_SELECT } from '../lib/mappers.js'
import { prisma } from '../lib/prisma.js'

type Tx = Prisma.TransactionClient

const DISPLAY_ORDER: Prisma.TourOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { id: 'asc' }]

/** Oldest featured first — used when a new feature needs to drop one. */
const FEATURED_AGE_ORDER: Prisma.TourOrderByWithRelationInput[] = [
    { featuredAt: { sort: 'asc', nulls: 'first' } },
    { createdAt: 'asc' },
    { id: 'asc' },
]

class TourRepository {
    async findAll() {
        return prisma.tour.findMany({ orderBy: DISPLAY_ORDER })
    }

    async findFeatured(limit: number) {
        return prisma.tour.findMany({
            where: { featured: true },
            orderBy: DISPLAY_ORDER,
            take: limit,
        })
    }

    /**
     * Unfeature oldest featured tours until at most `keep` remain
     * (optionally ignoring `excludeId`, e.g. the tour about to be featured).
     */
    async dropOldestFeatured(tx: Tx, keep: number, excludeId?: string) {
        const others = await tx.tour.findMany({
            where: {
                featured: true,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            orderBy: FEATURED_AGE_ORDER,
            select: { id: true },
        })
        const toDrop = others.slice(0, Math.max(0, others.length - keep))
        if (toDrop.length === 0) return
        await tx.tour.updateMany({
            where: { id: { in: toDrop.map((tour) => tour.id) } },
            data: { featured: false, featuredAt: null },
        })
    }

    async createFeaturing(data: Prisma.TourCreateInput, featuredLimit: number) {
        return prisma.$transaction(async (tx) => {
            if (data.featured) {
                await this.dropOldestFeatured(tx, featuredLimit - 1)
                return tx.tour.create({
                    data: { ...data, featured: true, featuredAt: new Date() },
                })
            }
            return tx.tour.create({
                data: { ...data, featured: false, featuredAt: null },
            })
        })
    }

    async updateFeaturing(
        slug: string,
        data: Prisma.TourUpdateInput,
        options: { featuredLimit: number; excludeId: string; wasFeatured: boolean },
    ) {
        return prisma.$transaction(async (tx) => {
            const featured = data.featured
            if (featured === true) {
                await this.dropOldestFeatured(tx, options.featuredLimit - 1, options.excludeId)
                return tx.tour.update({
                    where: { slug },
                    data: {
                        ...data,
                        featured: true,
                        ...(options.wasFeatured ? {} : { featuredAt: new Date() }),
                    },
                })
            }
            if (featured === false) {
                return tx.tour.update({
                    where: { slug },
                    data: { ...data, featured: false, featuredAt: null },
                })
            }
            return tx.tour.update({ where: { slug }, data })
        })
    }

    async search(input: {
        where: Prisma.TourWhereInput
        orderBy: Prisma.TourOrderByWithRelationInput[]
        skip: number
        take: number
    }) {
        const [items, total] = await prisma.$transaction([
            prisma.tour.findMany({ ...input, select: TOUR_LIST_SELECT }),
            prisma.tour.count({ where: input.where }),
        ])
        return { items, total }
    }

    async findForSuggest() {
        return prisma.tour.findMany({
            orderBy: DISPLAY_ORDER,
            select: { ...TOUR_LIST_SELECT, lat: true, lng: true },
        })
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
