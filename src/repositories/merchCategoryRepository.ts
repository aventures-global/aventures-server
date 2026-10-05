import { prisma } from '../lib/prisma.js'

class MerchCategoryRepository {
    async findAll() {
        return prisma.merchCategory.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { products: true } } },
        })
    }

    async findById(id: string) {
        return prisma.merchCategory.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        })
    }

    async findByName(name: string) {
        return prisma.merchCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    }

    async create(id: string, name: string) {
        const last = await prisma.merchCategory.findFirst({ orderBy: { sortOrder: 'desc' } })
        return prisma.merchCategory.create({
            data: { id, name, sortOrder: (last?.sortOrder ?? -1) + 1 },
            include: { _count: { select: { products: true } } },
        })
    }

    async rename(id: string, name: string) {
        return prisma.merchCategory.update({
            where: { id },
            data: { name },
            include: { _count: { select: { products: true } } },
        })
    }

    async delete(id: string) {
        return prisma.merchCategory.delete({ where: { id } })
    }

    async reorder(ids: string[]) {
        return prisma.$transaction(
            ids.map((id, index) => prisma.merchCategory.update({ where: { id }, data: { sortOrder: index } })),
        )
    }
}

export default new MerchCategoryRepository()
