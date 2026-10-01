import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import { verifyNeonToken } from '../lib/neonAuth.js'

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization
        if (!header?.startsWith('Bearer ')) {
            throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header')
        }

        const token = header.slice('Bearer '.length).trim()
        if (!token) {
            throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer token')
        }

        const identity = await verifyNeonToken(token)
        if (!identity) {
            throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token')
        }

        req.auth = identity
        next()
    } catch (err) {
        next(err)
    }
}
