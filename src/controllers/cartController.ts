import type { Request, Response } from 'express'

import { AppError } from '../lib/errors.js'
import CartService from '../services/cartService.js'

class CartController {
  async list(req: Request, res: Response) {
    const userId = req.auth?.userId
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    const items = await CartService.list(userId)
    res.json({ items })
  }

  async addItem(req: Request, res: Response) {
    const userId = req.auth?.userId
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    const item = await CartService.addItem(userId, req.body)
    res.status(201).json({ item })
  }

  async updateItem(req: Request, res: Response) {
    const userId = req.auth?.userId
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    const item = await CartService.updateItem(
      userId,
      String(req.params.id),
      req.body.qty,
    )
    if (!item) {
      res.status(204).send()
      return
    }
    res.json({ item })
  }

  async removeItem(req: Request, res: Response) {
    const userId = req.auth?.userId
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    await CartService.removeItem(userId, String(req.params.id))
    res.status(204).send()
  }

  async clear(req: Request, res: Response) {
    const userId = req.auth?.userId
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    await CartService.clear(userId)
    res.status(204).send()
  }
}

export default new CartController()
