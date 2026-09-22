import { AppError } from '../lib/errors.js'
import { toMerchDto } from '../lib/mappers.js'
import CartRepository from '../repositories/cartRepository.js'
import MerchRepository from '../repositories/merchRepository.js'
import UserService from './userService.js'

type CartRow = Awaited<ReturnType<typeof CartRepository.findByUserId>>[number]

function serializeCartRow(item: CartRow) {
  return {
    id: item.id,
    productId: item.merchProductId,
    qty: item.qty,
    size: item.size || undefined,
    product: toMerchDto(item.merchProduct),
  }
}

class CartService {
  async list(userId: string) {
    await UserService.bootstrap(userId)
    const items = await CartRepository.findByUserId(userId)
    return items.map(serializeCartRow)
  }

  async addItem(
    userId: string,
    input: { productId: string; qty: number; size?: string },
  ) {
    await UserService.bootstrap(userId)

    const product = await MerchRepository.findById(input.productId)
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'Merch product not found')
    }
    if (!product.inStock) {
      throw new AppError(400, 'OUT_OF_STOCK', 'Product is out of stock')
    }

    const size = input.size ?? ''
    if (product.sizes.length > 0 && size && !product.sizes.includes(size)) {
      throw new AppError(400, 'INVALID_SIZE', 'Invalid size for this product')
    }
    if (product.sizes.length > 0 && !size) {
      throw new AppError(400, 'INVALID_SIZE', 'Size is required for this product')
    }

    const existing = await CartRepository.findLine(userId, input.productId, size)
    if (existing) {
      const updated = await CartRepository.updateQty(
        existing.id,
        existing.qty + input.qty,
      )
      return serializeCartRow(updated)
    }

    const created = await CartRepository.create({
      userId,
      merchProductId: input.productId,
      size,
      qty: input.qty,
    })
    return serializeCartRow(created)
  }

  async updateItem(userId: string, itemId: string, qty: number) {
    await UserService.bootstrap(userId)
    const item = await CartRepository.findByIdForUser(itemId, userId)
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Cart item not found')
    }

    if (qty <= 0) {
      await CartRepository.deleteById(itemId)
      return null
    }

    const updated = await CartRepository.updateQty(itemId, qty)
    return serializeCartRow(updated)
  }

  async removeItem(userId: string, itemId: string) {
    await UserService.bootstrap(userId)
    const item = await CartRepository.findByIdForUser(itemId, userId)
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Cart item not found')
    }
    await CartRepository.deleteById(itemId)
  }

  async clear(userId: string) {
    await UserService.bootstrap(userId)
    await CartRepository.clearForUser(userId)
  }
}

export default new CartService()
