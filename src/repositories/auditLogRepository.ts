import type { Prisma } from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const actorSelect = { select: { id: true, email: true, firstName: true, lastName: true } } as const

class AuditLogRepository {
    async create(entry: {
        actorId: string | null
        subjectUserId: string | null
        action: string
        metadata?: Record<string, unknown>
    }) {
        return prisma.auditLog.create({
            data: {
                actorId: entry.actorId,
                subjectUserId: entry.subjectUserId,
                action: entry.action,
                metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
            },
        })
    }

    /** Entries about the user plus actions the user performed. */
    async findForUser(userId: string, skip: number, take: number) {
        const where: Prisma.AuditLogWhereInput = { OR: [{ subjectUserId: userId }, { actorId: userId }] }
        return prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: { actor: actorSelect, subjectUser: actorSelect },
            }),
            prisma.auditLog.count({ where }),
        ])
    }
}

export default new AuditLogRepository()
