import { createHash, randomBytes } from 'node:crypto'

import type { z } from 'zod'

import { renderStaffInvitationEmail } from '../emails/staffInvitationEmail.js'
import type { StaffInvitation, User } from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import { sendEmail } from '../lib/mailer.js'
import { isPromotion } from '../lib/permissions.js'
import AuditLogRepository from '../repositories/auditLogRepository.js'
import InvitationRepository from '../repositories/invitationRepository.js'
import UserRepository from '../repositories/userRepository.js'
import type { invitationCreateSchema, invitationListSchema } from '../schemas/index.js'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_ADMIN_ORIGIN = 'http://localhost:5174'
const DEFAULT_SITE_URL = 'https://aventures-client.vercel.app'

type Person = Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>
type InvitationRow = StaffInvitation & { user: Person; invitedBy: Person | null }

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

function personName(person: Person | null) {
    if (!person) return 'An AVENtures admin'
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || 'An AVENtures admin'
}

function isExpired(invitation: StaffInvitation) {
    return invitation.status === 'PENDING' && invitation.expiresAt.getTime() < Date.now()
}

function serialize(invitation: InvitationRow) {
    return {
        id: invitation.id,
        role: invitation.role,
        status: isExpired(invitation) ? 'EXPIRED' : invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        respondedAt: invitation.respondedAt,
        user: invitation.user,
        invitedBy: invitation.invitedBy,
    }
}

class InvitationService {
    async create(actorId: string, input: z.infer<typeof invitationCreateSchema>) {
        const user = await UserRepository.findById(input.userId)
        if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
        if (user.id === actorId) {
            throw new AppError(400, 'INVALID_INVITATION', 'You cannot invite yourself')
        }
        if (!user.email) {
            throw new AppError(400, 'INVALID_INVITATION', 'This account has no email address to send the invitation to')
        }
        if (!isPromotion(user.role, input.role)) {
            throw new AppError(
                400,
                'INVALID_INVITATION',
                'Invitations only promote an account. Use the access controls to lower a role.',
            )
        }

        await InvitationRepository.revokePendingForUser(user.id)
        const token = randomBytes(32).toString('base64url')
        const invitation = await InvitationRepository.create({
            userId: user.id,
            role: input.role,
            invitedById: actorId,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        })
        await AuditLogRepository.create({
            actorId,
            subjectUserId: user.id,
            action: 'invitation.sent',
            metadata: { role: input.role },
        })

        const adminOrigin = (process.env.ADMIN_ORIGIN?.trim() || DEFAULT_ADMIN_ORIGIN).replace(/\/$/, '')
        const acceptUrl = `${adminOrigin}/accept-invite?token=${token}`
        let emailSent = true
        try {
            await sendEmail({
                to: user.email,
                ...renderStaffInvitationEmail({
                    role: input.role,
                    inviterName: personName(invitation.invitedBy),
                    acceptUrl,
                    expiresAt: invitation.expiresAt,
                    siteUrl: process.env.PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL,
                }),
            })
        } catch (err) {
            emailSent = false
            console.error('Invitation email failed', err instanceof Error ? err.message : err)
        }

        // The link is only returned when email failed, so the super admin can share it another way.
        return { invitation: serialize(invitation), emailSent, acceptUrl: emailSent ? null : acceptUrl }
    }

    async list(input: z.infer<typeof invitationListSchema>) {
        await InvitationRepository.expireStale()
        const rows = await InvitationRepository.findMany({
            ...(input.status !== 'all' ? { status: input.status } : {}),
            ...(input.userId ? { userId: input.userId } : {}),
        })
        return rows.map(serialize)
    }

    async revoke(actorId: string, id: string) {
        const invitation = await InvitationRepository.findById(id)
        if (!invitation) throw new AppError(404, 'NOT_FOUND', 'Invitation not found')
        if (invitation.status !== 'PENDING') {
            throw new AppError(400, 'INVALID_INVITATION', 'Only pending invitations can be revoked')
        }
        const updated = await InvitationRepository.setStatus(id, 'REVOKED')
        await AuditLogRepository.create({
            actorId,
            subjectUserId: invitation.userId,
            action: 'invitation.revoked',
            metadata: { role: invitation.role },
        })
        return serialize(updated)
    }

    /** What the invited person sees before accepting; the token is the only credential. */
    async lookup(token: string) {
        const invitation = await this.requireByToken(token)
        return {
            role: invitation.role,
            status: serialize(invitation).status,
            email: invitation.user.email,
            invitedBy: personName(invitation.invitedBy),
            expiresAt: invitation.expiresAt,
        }
    }

    async accept(token: string) {
        const invitation = await this.requireByToken(token)
        if (isExpired(invitation)) {
            await InvitationRepository.setStatus(invitation.id, 'EXPIRED')
            throw new AppError(410, 'INVITATION_EXPIRED', 'This invitation has expired. Ask for a new one.')
        }
        if (invitation.status !== 'PENDING') {
            throw new AppError(409, 'INVITATION_CLOSED', 'This invitation is no longer active')
        }
        if (invitation.user.role === 'SUPER_ADMIN') {
            throw new AppError(400, 'INVALID_INVITATION', 'Super admin roles are managed by the server')
        }

        await UserRepository.setRole(invitation.userId, invitation.role)
        await InvitationRepository.setStatus(invitation.id, 'ACCEPTED')
        await AuditLogRepository.create({
            actorId: invitation.userId,
            subjectUserId: invitation.userId,
            action: 'invitation.accepted',
            metadata: { role: invitation.role, from: invitation.user.role },
        })
        return { role: invitation.role, email: invitation.user.email }
    }

    private async requireByToken(token: string) {
        const invitation = await InvitationRepository.findByTokenHash(hashToken(token))
        if (!invitation) throw new AppError(404, 'NOT_FOUND', 'This invitation link is not valid')
        return invitation
    }
}

export default new InvitationService()
