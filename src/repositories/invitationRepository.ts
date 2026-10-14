import type { InvitationStatus, Prisma, UserRole } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const personSelect = { select: { id: true, email: true, firstName: true, lastName: true, role: true } } as const
const include = { user: personSelect, invitedBy: personSelect } as const

class InvitationRepository {
    async create(data: { userId: string; role: UserRole; invitedById: string; tokenHash: string; expiresAt: Date }) {
        return prisma.staffInvitation.create({ data, include })
    }

    async findMany(where: Prisma.StaffInvitationWhereInput) {
        return prisma.staffInvitation.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include })
    }

    async findById(id: string) {
        return prisma.staffInvitation.findUnique({ where: { id }, include })
    }

    async findByTokenHash(tokenHash: string) {
        return prisma.staffInvitation.findUnique({ where: { tokenHash }, include })
    }

    async revokePendingForUser(userId: string) {
        return prisma.staffInvitation.updateMany({
            where: { userId, status: 'PENDING' },
            data: { status: 'REVOKED', respondedAt: new Date() },
        })
    }

    async expireStale() {
        return prisma.staffInvitation.updateMany({
            where: { status: 'PENDING', expiresAt: { lt: new Date() } },
            data: { status: 'EXPIRED' },
        })
    }

    async setStatus(id: string, status: InvitationStatus) {
        return prisma.staffInvitation.update({
            where: { id },
            data: { status, respondedAt: new Date() },
            include,
        })
    }
}

export default new InvitationRepository()
