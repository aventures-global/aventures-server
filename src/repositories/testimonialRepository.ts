import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

class TestimonialRepository {
    async findAll() {
        return prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } })
    }

    async findById(id: string) {
        return prisma.testimonial.findUnique({ where: { id } })
    }

    async create(data: Prisma.TestimonialCreateInput) {
        return prisma.testimonial.create({ data })
    }

    async updateById(id: string, data: Prisma.TestimonialUpdateInput) {
        return prisma.testimonial.update({ where: { id }, data })
    }

    async deleteById(id: string) {
        return prisma.testimonial.delete({ where: { id } })
    }

    async nextSortOrder() {
        const { _max } = await prisma.testimonial.aggregate({ _max: { sortOrder: true } })
        return (_max.sortOrder ?? -1) + 1
    }

    async reorder(ids: string[]) {
        return prisma.$transaction(
            ids.map((id, index) =>
                prisma.testimonial.update({ where: { id }, data: { sortOrder: index } }),
            ),
        )
    }
}

export default new TestimonialRepository()
