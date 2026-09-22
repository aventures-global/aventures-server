import type { NextFunction, Request, Response } from 'express'

import { AppError, isAppError } from '../lib/errors.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
}
