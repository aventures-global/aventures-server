import type {
    DocumentCategory,
    DocumentStatus,
    FileSpace,
    Prisma,
} from '../generated/prisma/client.js'

import { prisma } from '../lib/prisma.js'

const ownerSelect = {
    select: { id: true, email: true, firstName: true, lastName: true },
} as const

const fileInclude = {
    owner: ownerSelect,
    uploadedBy: ownerSelect,
    folder: { select: { id: true, name: true, parentId: true } },
} as const

class DocumentRepository {
    async findFolderById(id: string) {
        return prisma.fileFolder.findUnique({ where: { id } })
    }

    async listFolders(input: {
        space: FileSpace
        ownerUserId: string | null
        parentId: string | null
    }) {
        return prisma.fileFolder.findMany({
            where: {
                space: input.space,
                ownerUserId: input.ownerUserId,
                parentId: input.parentId,
            },
            orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        })
    }

    async createFolder(data: {
        space: FileSpace
        name: string
        parentId: string | null
        ownerUserId: string | null
        createdById: string
    }) {
        return prisma.fileFolder.create({ data })
    }

    async renameFolder(id: string, name: string) {
        return prisma.fileFolder.update({ where: { id }, data: { name } })
    }

    async deleteFolder(id: string) {
        // Soft-delete files in this folder and descendants, then remove the folder tree.
        const folderIds: string[] = []
        const queue = [id]
        while (queue.length) {
            const current = queue.pop()!
            folderIds.push(current)
            const children = await prisma.fileFolder.findMany({
                where: { parentId: current },
                select: { id: true },
            })
            queue.push(...children.map((child) => child.id))
        }

        await prisma.$transaction([
            prisma.managedFile.updateMany({
                where: { folderId: { in: folderIds }, deletedAt: null },
                data: { deletedAt: new Date() },
            }),
            prisma.fileFolder.delete({ where: { id } }),
        ])
    }

    async folderBreadcrumb(folderId: string | null) {
        const crumbs: { id: string; name: string }[] = []
        let currentId = folderId
        while (currentId) {
            const folder = await prisma.fileFolder.findUnique({
                where: { id: currentId },
                select: { id: true, name: true, parentId: true },
            })
            if (!folder) break
            crumbs.unshift({ id: folder.id, name: folder.name })
            currentId = folder.parentId
        }
        return crumbs
    }

    async findFileById(id: string) {
        return prisma.managedFile.findUnique({
            where: { id },
            include: fileInclude,
        })
    }

    async listFiles(input: {
        space: FileSpace
        ownerUserId?: string | null
        /** Pass `undefined` to ignore folder (cross-folder search). */
        folderId?: string | null
        q: string
        category?: DocumentCategory
        status?: DocumentStatus
    }) {
        const where: Prisma.ManagedFileWhereInput = {
            space: input.space,
            deletedAt: null,
        }
        if (input.folderId !== undefined) {
            where.folderId = input.folderId
        }
        if (input.ownerUserId !== undefined) {
            where.ownerUserId = input.ownerUserId
        }
        if (input.category) where.category = input.category
        if (input.status) where.status = input.status
        if (input.q) {
            where.OR = [
                { displayName: { contains: input.q, mode: 'insensitive' } },
                { notes: { contains: input.q, mode: 'insensitive' } },
                { owner: { email: { contains: input.q, mode: 'insensitive' } } },
                { owner: { firstName: { contains: input.q, mode: 'insensitive' } } },
                { owner: { lastName: { contains: input.q, mode: 'insensitive' } } },
            ]
        }
        return prisma.managedFile.findMany({
            where,
            include: fileInclude,
            orderBy: [{ updatedAt: 'desc' }, { displayName: 'asc' }],
            take: 200,
        })
    }

    async createFile(data: {
        space: FileSpace
        folderId: string | null
        ownerUserId: string | null
        uploadedById: string
        displayName: string
        category: DocumentCategory
        status: DocumentStatus
        storageKey: string
        contentType: string
        sizeBytes: number
        notes?: string | null
    }) {
        return prisma.managedFile.create({
            data,
            include: fileInclude,
        })
    }

    async updateFile(
        id: string,
        data: {
            displayName?: string
            category?: DocumentCategory
            status?: DocumentStatus
            notes?: string | null
            folderId?: string | null
        },
    ) {
        return prisma.managedFile.update({
            where: { id },
            data,
            include: fileInclude,
        })
    }

    async softDeleteFile(id: string) {
        return prisma.managedFile.update({
            where: { id },
            data: { deletedAt: new Date() },
            include: fileInclude,
        })
    }

    async createShare(data: {
        fileId: string
        tokenHash: string
        createdById: string
        expiresAt: Date
        maxDownloads: number | null
    }) {
        return prisma.documentShare.create({
            data,
            include: {
                file: { select: { id: true, displayName: true, contentType: true, sizeBytes: true } },
                createdBy: ownerSelect,
            },
        })
    }

    async listSharesForFile(fileId: string) {
        return prisma.documentShare.findMany({
            where: { fileId },
            include: { createdBy: ownerSelect },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findShareByTokenHash(tokenHash: string) {
        return prisma.documentShare.findUnique({
            where: { tokenHash },
            include: {
                file: true,
                createdBy: ownerSelect,
            },
        })
    }

    async findShareById(id: string) {
        return prisma.documentShare.findUnique({
            where: { id },
            include: {
                file: { select: { id: true, displayName: true } },
                createdBy: ownerSelect,
            },
        })
    }

    async revokeShare(id: string) {
        return prisma.documentShare.update({
            where: { id },
            data: { revokedAt: new Date() },
            include: {
                file: { select: { id: true, displayName: true } },
                createdBy: ownerSelect,
            },
        })
    }

    async incrementShareDownloads(id: string) {
        return prisma.documentShare.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        })
    }
}

export default new DocumentRepository()
