import { MERCH_INCLUDE } from '../lib/mappers.js'
import { prisma } from '../lib/prisma.js'

class CartRepository {
    async findByUserId(userId: string) {
        return prisma.cartItem.findMany({
            where: { userId },
            include: { merchProduct: { include: MERCH_INCLUDE } },
            orderBy: { createdAt: 'asc' },
        })
    }

    async findByIdForUser(id: string, userId: string) {
        return prisma.cartItem.findFirst({
            where: { id, userId },
            include: { merchProduct: { include: MERCH_INCLUDE } },
        })
    }

    async findLine(userId: string, merchProductId: string, size: string) {
        return prisma.cartItem.findUnique({
            where: {
                userId_merchProductId_size: { userId, merchProductId, size },
            },
        })
    }

    async create(data: {
        userId: string
        merchProductId: string
        size: string
        qty: number
    }) {
        return prisma.cartItem.create({
            data,
            include: { merchProduct: { include: MERCH_INCLUDE } },
        })
    }

    async updateQty(id: string, qty: number) {
        return prisma.cartItem.update({
            where: { id },
            data: { qty },
            include: { merchProduct: { include: MERCH_INCLUDE } },
        })
    }

    async deleteById(id: string) {
        return prisma.cartItem.delete({ where: { id } })
    }

    async clearForUser(userId: string) {
        return prisma.cartItem.deleteMany({ where: { userId } })
    }
}

export default new CartRepository()
