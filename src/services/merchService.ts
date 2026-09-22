import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { toMerchDto } from '../lib/mappers.js'
import MerchRepository from '../repositories/merchRepository.js'
import type { merchCreateSchema, merchUpdateSchema } from '../schemas/index.js'

class MerchService {
  async list() {
    const products = await MerchRepository.findAll()
    return products.map(toMerchDto)
  }

  async getBySlug(slug: string) {
    const product = await MerchRepository.findBySlug(slug)
    if (!product) {
      throw new AppError(404, 'NOT_FOUND', 'Merch product not found')
    }
    return toMerchDto(product)
  }

  async create(input: z.infer<typeof merchCreateSchema>) {
    const id = input.id ?? input.slug
    const existing = await MerchRepository.findBySlug(input.slug)
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Merch slug already exists')
    }

    const product = await MerchRepository.create({
      id,
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      priceCents: input.priceCents,
      currency: input.currency,
      category: input.category,
      coverImage: input.coverImage,
      gallery: input.gallery,
      sizes: input.sizes,
      inStock: input.inStock,
    })
    return toMerchDto(product)
  }

  async updateBySlug(slug: string, input: z.infer<typeof merchUpdateSchema>) {
    await this.getBySlug(slug)
    const product = await MerchRepository.updateBySlug(slug, {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
      ...(input.gallery !== undefined ? { gallery: input.gallery } : {}),
      ...(input.sizes !== undefined ? { sizes: input.sizes } : {}),
      ...(input.inStock !== undefined ? { inStock: input.inStock } : {}),
    })
    return toMerchDto(product)
  }

  async deleteBySlug(slug: string) {
    await this.getBySlug(slug)
    await MerchRepository.deleteBySlug(slug)
  }
}

export default new MerchService()
