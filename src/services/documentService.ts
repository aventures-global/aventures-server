import { createHash, randomBytes } from 'node:crypto'
import { extname } from 'node:path'
import type { Readable } from 'node:stream'

import type { z } from 'zod'

import type {
    DocumentCategory,
    DocumentStatus,
    DocumentShare,
    FileSpace,
    ManagedFile,
    User,
} from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import {
    attachmentDisposition,
    buildPrivateDocumentKey,
    deleteObject,
    getObjectStream,
    putPrivateObject,
} from '../lib/storage.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import DocumentRepository from '../repositories/documentRepository.js'
import UserRepository from '../repositories/userRepository.js'
import PermissionService from './permissionService.js'
import type {
    documentListSchema,
    documentShareCreateSchema,
    fileUpdateSchema,
    folderCreateSchema,
} from '../schemas/index.js'

type Actor = Pick<User, 'id' | 'role'>

const CUSTOMER_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
])

const INTERNAL_MIME = new Set([
    ...CUSTOMER_MIME,
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
])

const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'application/zip': 'zip',
}

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

/** Keep the real file extension when staff type a custom display name like "passport". */
function withFileExtension(name: string, extension: string) {
    const trimmed = name.trim()
    if (!trimmed) return trimmed
    const ext = extension.replace(/^\./, '').toLowerCase()
    if (!ext) return trimmed
    const currentExt = extname(trimmed).replace(/^\./, '').toLowerCase()
    if (currentExt === ext) return trimmed
    if (currentExt) return trimmed
    return `${trimmed}.${ext}`
}

function personName(person: { firstName: string | null; lastName: string | null; email: string | null } | null) {
    if (!person) return null
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email
}

function serializeFolder(folder: {
    id: string
    space: FileSpace
    name: string
    parentId: string | null
    ownerUserId: string | null
    createdAt: Date
    updatedAt: Date
}) {
    return {
        id: folder.id,
        space: folder.space,
        name: folder.name,
        parentId: folder.parentId,
        ownerUserId: folder.ownerUserId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
    }
}

function serializeFile(file: ManagedFile & {
    owner: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null
    uploadedBy: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null
    folder: { id: string; name: string; parentId: string | null } | null
}) {
    return {
        id: file.id,
        space: file.space,
        folderId: file.folderId,
        folder: file.folder,
        ownerUserId: file.ownerUserId,
        owner: file.owner
            ? {
                  id: file.owner.id,
                  email: file.owner.email,
                  name: personName(file.owner),
              }
            : null,
        uploadedBy: file.uploadedBy
            ? {
                  id: file.uploadedBy.id,
                  email: file.uploadedBy.email,
                  name: personName(file.uploadedBy),
              }
            : null,
        displayName: file.displayName,
        category: file.category,
        status: file.status,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        notes: file.notes,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    }
}

function serializeShare(
    share: DocumentShare & {
        createdBy?: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null
        file?: { id: string; displayName: string; contentType?: string; sizeBytes?: number }
    },
    token?: string,
) {
    const expired = share.expiresAt.getTime() < Date.now()
    const revoked = Boolean(share.revokedAt)
    const exhausted =
        share.maxDownloads != null && share.downloadCount >= share.maxDownloads
    return {
        id: share.id,
        fileId: share.fileId,
        file: share.file
            ? {
                  id: share.file.id,
                  displayName: share.file.displayName,
                  contentType: share.file.contentType,
                  sizeBytes: share.file.sizeBytes,
              }
            : undefined,
        createdBy: share.createdBy
            ? {
                  id: share.createdBy.id,
                  email: share.createdBy.email,
                  name: personName(share.createdBy),
              }
            : null,
        expiresAt: share.expiresAt,
        revokedAt: share.revokedAt,
        downloadCount: share.downloadCount,
        maxDownloads: share.maxDownloads,
        createdAt: share.createdAt,
        status: revoked ? 'REVOKED' : exhausted ? 'EXHAUSTED' : expired ? 'EXPIRED' : 'ACTIVE',
        token: token ?? undefined,
        url: token ? shareUrl(token) : undefined,
    }
}

function shareUrl(token: string) {
    const origin = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '')
    return `${origin}/shared/${token}`
}

function assertShareActive(
    share: DocumentShare & { file: ManagedFile | null },
): asserts share is DocumentShare & { file: ManagedFile } {
    if (!share.file || share.file.deletedAt) {
        throw new AppError(404, 'NOT_FOUND', 'Shared file not found')
    }
    if (share.revokedAt) {
        throw new AppError(410, 'SHARE_REVOKED', 'This share link has been revoked')
    }
    if (share.expiresAt.getTime() < Date.now()) {
        throw new AppError(410, 'SHARE_EXPIRED', 'This share link has expired')
    }
    if (share.maxDownloads != null && share.downloadCount >= share.maxDownloads) {
        throw new AppError(410, 'SHARE_EXHAUSTED', 'This share link has reached its download limit')
    }
}

class DocumentService {
    private async requireView(actor: Actor) {
        await PermissionService.assert(actor.role, 'documents.view')
    }

    private async requireManage(actor: Actor) {
        await PermissionService.assert(actor.role, 'documents.manage')
    }

    private async requireShare(actor: Actor) {
        await PermissionService.assert(actor.role, 'documents.share')
    }

    private async assertCustomerOwner(ownerUserId: string) {
        const owner = await UserRepository.findById(ownerUserId)
        if (!owner || owner.role !== 'CUSTOMER') {
            throw new AppError(400, 'INVALID_OWNER', 'Customer documents must belong to a customer account')
        }
        return owner
    }

    private async assertFolderContext(input: {
        space: FileSpace
        folderId: string | null | undefined
        ownerUserId: string | null
    }) {
        if (!input.folderId) return null
        const folder = await DocumentRepository.findFolderById(input.folderId)
        if (!folder) throw new AppError(404, 'NOT_FOUND', 'Folder not found')
        if (folder.space !== input.space) {
            throw new AppError(400, 'INVALID_FOLDER', 'Folder is in a different space')
        }
        if (input.space === 'CUSTOMER' && folder.ownerUserId !== input.ownerUserId) {
            throw new AppError(400, 'INVALID_FOLDER', 'Folder belongs to a different customer')
        }
        if (input.space === 'INTERNAL' && folder.ownerUserId) {
            throw new AppError(400, 'INVALID_FOLDER', 'Internal folders cannot have a customer owner')
        }
        return folder
    }

    async browse(actor: Actor, query: z.infer<typeof documentListSchema>) {
        await this.requireView(actor)

        if (query.space === 'CUSTOMER' && !query.ownerUserId) {
            // Allow browsing all customer files only when searching; otherwise require a customer.
            if (!query.q && query.folderId === null) {
                throw new AppError(
                    400,
                    'OWNER_REQUIRED',
                    'Select a customer to browse their documents, or search across customers',
                )
            }
        }
        if (query.space === 'INTERNAL' && query.ownerUserId) {
            throw new AppError(400, 'INVALID_OWNER', 'Company files are not tied to a customer')
        }
        if (query.space === 'CUSTOMER' && query.ownerUserId) {
            await this.assertCustomerOwner(query.ownerUserId)
        }

        const ownerUserId =
            query.space === 'INTERNAL' ? null : query.ownerUserId !== undefined ? query.ownerUserId : undefined

        // Cross-customer search: ignore folder and return matching files only.
        const searchingAcross = query.space === 'CUSTOMER' && Boolean(query.q) && !query.ownerUserId
        const folderId = searchingAcross ? undefined : query.folderId

        const folders =
            searchingAcross || folderId === undefined
                ? []
                : await DocumentRepository.listFolders({
                      space: query.space,
                      ownerUserId: ownerUserId ?? null,
                      parentId: folderId,
                  })

        const files = await DocumentRepository.listFiles({
            space: query.space,
            ownerUserId: ownerUserId === undefined ? undefined : ownerUserId,
            folderId,
            q: query.q,
            category: query.category === 'all' ? undefined : query.category,
            status: query.status === 'all' ? undefined : query.status,
        })

        const breadcrumb =
            searchingAcross || folderId === undefined || folderId === null
                ? []
                : await DocumentRepository.folderBreadcrumb(folderId)

        return {
            space: query.space,
            ownerUserId: ownerUserId ?? null,
            folderId: searchingAcross ? null : (folderId ?? null),
            breadcrumb,
            folders: folders.map(serializeFolder),
            files: files.map(serializeFile),
        }
    }

    async createFolder(actor: Actor, input: z.infer<typeof folderCreateSchema>) {
        await this.requireManage(actor)

        let ownerUserId: string | null = null
        if (input.space === 'CUSTOMER') {
            if (!input.ownerUserId) {
                throw new AppError(400, 'OWNER_REQUIRED', 'Customer folders require a customer')
            }
            await this.assertCustomerOwner(input.ownerUserId)
            ownerUserId = input.ownerUserId
        }

        await this.assertFolderContext({
            space: input.space,
            folderId: input.parentId ?? null,
            ownerUserId,
        })

        const folder = await DocumentRepository.createFolder({
            space: input.space,
            name: input.name,
            parentId: input.parentId ?? null,
            ownerUserId,
            createdById: actor.id,
        })
        return { folder: serializeFolder(folder) }
    }

    async renameFolder(actor: Actor, folderId: string, name: string) {
        await this.requireManage(actor)
        const existing = await DocumentRepository.findFolderById(folderId)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Folder not found')
        const folder = await DocumentRepository.renameFolder(folderId, name)
        return { folder: serializeFolder(folder) }
    }

    async deleteFolder(actor: Actor, folderId: string) {
        await this.requireManage(actor)
        const existing = await DocumentRepository.findFolderById(folderId)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Folder not found')
        await DocumentRepository.deleteFolder(folderId)
        return { ok: true }
    }

    async upload(
        actor: Actor,
        input: {
            space: FileSpace
            ownerUserId?: string
            folderId?: string | null
            displayName?: string
            category?: DocumentCategory
            notes?: string | null
            file: Express.Multer.File
        },
    ) {
        await this.requireManage(actor)

        let ownerUserId: string | null = null
        if (input.space === 'CUSTOMER') {
            if (!input.ownerUserId) {
                throw new AppError(400, 'OWNER_REQUIRED', 'Customer documents require a customer')
            }
            await this.assertCustomerOwner(input.ownerUserId)
            ownerUserId = input.ownerUserId
        }

        await this.assertFolderContext({
            space: input.space,
            folderId: input.folderId ?? null,
            ownerUserId,
        })

        const mime = input.file.mimetype.toLowerCase()
        const allowed = input.space === 'INTERNAL' ? INTERNAL_MIME : CUSTOMER_MIME
        if (!allowed.has(mime)) {
            throw new AppError(
                400,
                'INVALID_FILE',
                input.space === 'INTERNAL'
                    ? 'Allowed types: images, PDF, Word, Excel, text, zip'
                    : 'Allowed types: JPEG, PNG, WebP, and PDF',
            )
        }
        if (mime === 'application/pdf' && input.file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
            throw new AppError(400, 'INVALID_FILE', 'This file is not a valid PDF')
        }

        const originalExt = extname(input.file.originalname).replace(/^\./, '').toLowerCase()
        const extension = EXT_BY_MIME[mime] ?? (originalExt || 'bin')
        const storageKey = buildPrivateDocumentKey(extension)
        const rawName =
            input.displayName?.trim() ||
            input.file.originalname?.trim() ||
            `document.${extension}`
        const displayName = withFileExtension(rawName, extension)

        await putPrivateObject({
            key: storageKey,
            body: input.file.buffer,
            contentType: mime,
            contentDisposition: attachmentDisposition(displayName),
        })

        const status: DocumentStatus = input.space === 'INTERNAL' ? 'APPROVED' : 'PENDING'
        const category: DocumentCategory = input.category ?? 'OTHER'

        try {
            const file = await DocumentRepository.createFile({
                space: input.space,
                folderId: input.folderId ?? null,
                ownerUserId,
                uploadedById: actor.id,
                displayName,
                category,
                status,
                storageKey,
                contentType: mime,
                sizeBytes: input.file.size,
                notes: input.notes ?? null,
            })

            await AuditLogRepository.create({
                actorId: actor.id,
                subjectUserId: ownerUserId,
                action: 'document.upload',
                metadata: {
                    fileId: file.id,
                    space: file.space,
                    displayName: file.displayName,
                    category: file.category,
                },
            })

            return { file: serializeFile(file) }
        } catch (err) {
            try {
                await deleteObject(storageKey)
            } catch {
                // Best-effort cleanup if DB write fails.
            }
            throw err
        }
    }

    async updateFile(actor: Actor, fileId: string, input: z.infer<typeof fileUpdateSchema>) {
        await this.requireManage(actor)
        const existing = await DocumentRepository.findFileById(fileId)
        if (!existing || existing.deletedAt) throw new AppError(404, 'NOT_FOUND', 'File not found')

        if (input.folderId !== undefined) {
            await this.assertFolderContext({
                space: existing.space,
                folderId: input.folderId,
                ownerUserId: existing.ownerUserId,
            })
        }

        const extension =
            EXT_BY_MIME[existing.contentType.toLowerCase()] ??
            extname(existing.storageKey).replace(/^\./, '').toLowerCase() ??
            extname(existing.displayName).replace(/^\./, '').toLowerCase()

        const patch = {
            ...input,
            displayName:
                input.displayName !== undefined
                    ? withFileExtension(input.displayName, extension)
                    : undefined,
        }

        const file = await DocumentRepository.updateFile(fileId, patch)

        if (input.status && input.status !== existing.status) {
            await AuditLogRepository.create({
                actorId: actor.id,
                subjectUserId: file.ownerUserId,
                action: 'document.status',
                metadata: {
                    fileId: file.id,
                    from: existing.status,
                    to: file.status,
                },
            })
        }

        return { file: serializeFile(file) }
    }

    async deleteFile(actor: Actor, fileId: string) {
        await this.requireManage(actor)
        const existing = await DocumentRepository.findFileById(fileId)
        if (!existing || existing.deletedAt) throw new AppError(404, 'NOT_FOUND', 'File not found')

        const file = await DocumentRepository.softDeleteFile(fileId)
        try {
            await deleteObject(existing.storageKey)
        } catch {
            // Soft-deleted even if R2 cleanup fails.
        }

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: file.ownerUserId,
            action: 'document.delete',
            metadata: { fileId: file.id, displayName: file.displayName },
        })

        return { ok: true }
    }

    async openDownload(actor: Actor, fileId: string): Promise<{
        stream: Readable
        contentType: string
        contentLength: number | undefined
        displayName: string
    }> {
        await this.requireView(actor)
        const file = await DocumentRepository.findFileById(fileId)
        if (!file || file.deletedAt) throw new AppError(404, 'NOT_FOUND', 'File not found')

        const object = await getObjectStream(file.storageKey)
        return {
            stream: object.body,
            contentType: object.contentType ?? file.contentType,
            contentLength: object.contentLength ?? file.sizeBytes,
            displayName: file.displayName,
        }
    }

    async createShare(actor: Actor, fileId: string, input: z.infer<typeof documentShareCreateSchema>) {
        await this.requireShare(actor)
        const file = await DocumentRepository.findFileById(fileId)
        if (!file || file.deletedAt) throw new AppError(404, 'NOT_FOUND', 'File not found')

        const token = randomBytes(32).toString('base64url')
        const share = await DocumentRepository.createShare({
            fileId,
            tokenHash: hashToken(token),
            createdById: actor.id,
            expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
            maxDownloads: input.maxDownloads ?? null,
        })

        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: file.ownerUserId,
            action: 'document.share.create',
            metadata: {
                shareId: share.id,
                fileId,
                expiresAt: share.expiresAt.toISOString(),
            },
        })

        return { share: serializeShare(share, token) }
    }

    async listShares(actor: Actor, fileId: string) {
        await this.requireView(actor)
        const file = await DocumentRepository.findFileById(fileId)
        if (!file || file.deletedAt) throw new AppError(404, 'NOT_FOUND', 'File not found')
        const shares = await DocumentRepository.listSharesForFile(fileId)
        return { shares: shares.map((share) => serializeShare(share)) }
    }

    async revokeShare(actor: Actor, shareId: string) {
        await this.requireShare(actor)
        const existing = await DocumentRepository.findShareById(shareId)
        if (!existing) throw new AppError(404, 'NOT_FOUND', 'Share not found')
        if (existing.revokedAt) return { share: serializeShare(existing) }

        const share = await DocumentRepository.revokeShare(shareId)
        await AuditLogRepository.create({
            actorId: actor.id,
            subjectUserId: null,
            action: 'document.share.revoke',
            metadata: { shareId: share.id, fileId: share.fileId },
        })
        return { share: serializeShare(share) }
    }

    async lookupShare(token: string) {
        const share = await DocumentRepository.findShareByTokenHash(hashToken(token))
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share link not found')
        assertShareActive(share)
        return {
            share: {
                id: share.id,
                expiresAt: share.expiresAt,
                downloadCount: share.downloadCount,
                maxDownloads: share.maxDownloads,
                file: {
                    id: share.file.id,
                    displayName: share.file.displayName,
                    contentType: share.file.contentType,
                    sizeBytes: share.file.sizeBytes,
                },
            },
        }
    }

    async openShareDownload(token: string): Promise<{
        stream: Readable
        contentType: string
        contentLength: number | undefined
        displayName: string
    }> {
        const share = await DocumentRepository.findShareByTokenHash(hashToken(token))
        if (!share) throw new AppError(404, 'NOT_FOUND', 'Share link not found')
        assertShareActive(share)

        const object = await getObjectStream(share.file.storageKey)
        await DocumentRepository.incrementShareDownloads(share.id)

        return {
            stream: object.body,
            contentType: object.contentType ?? share.file.contentType,
            contentLength: object.contentLength ?? share.file.sizeBytes,
            displayName: share.file.displayName,
        }
    }
}

export default new DocumentService()
