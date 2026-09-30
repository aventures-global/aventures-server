import type { NextFunction, Request, Response } from 'express'

import type { UserRole } from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import UserRepository from '../repositories/userRepository.js'

export function requireRole(...roles: UserRole[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const userId = req.auth?.userId
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
            }

            const user = await UserRepository.findById(userId)
            if (!user) {
                throw new AppError(401, 'UNAUTHORIZED', 'User not bootstrapped')
            }

            if (!roles.includes(user.role)) {
                throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions')
            }

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            }
            next()
        } catch (err) {
            next(err)
        }
    }
}
