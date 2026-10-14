import type { NextFunction, Request, Response } from 'express'

import type { User, UserRole } from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import type { Capability } from '../lib/permissions.js'
import UserRepository from '../repositories/userRepository.js'
import PermissionService from '../services/permissionService.js'

async function loadUser(req: Request): Promise<User> {
    const userId = req.auth?.userId
    if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const user = await UserRepository.findById(userId)
    if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'User not bootstrapped')
    }

    req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
    }
    return user
}

export function requireRole(...roles: UserRole[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const user = await loadUser(req)
            if (!roles.includes(user.role)) {
                throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions')
            }
            next()
        } catch (err) {
            next(err)
        }
    }
}

export function requirePermission(capability: Capability) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const user = await loadUser(req)
            await PermissionService.assert(user.role, capability)
            next()
        } catch (err) {
            next(err)
        }
    }
}

export const requireStaff = requireRole('STAFF', 'ADMIN', 'SUPER_ADMIN')
export const requireSuperAdmin = requireRole('SUPER_ADMIN')
export const requireContentEditor = requirePermission('content.edit')
