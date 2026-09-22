import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodType } from 'zod'

import { AppError } from '../lib/errors.js'

type RequestTarget = 'body' | 'params' | 'query'

export function validate(schema: ZodType, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target])
      ;(req as Request & Record<RequestTarget, unknown>)[target] = parsed
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            err.issues.map((issue) => issue.message).join('; ') || 'Invalid request',
          ),
        )
        return
      }
      next(err)
    }
  }
}
