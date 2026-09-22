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
}

export default new TestimonialRepository()
