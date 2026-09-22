import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { toTestimonialDto } from '../lib/mappers.js'
import TestimonialRepository from '../repositories/testimonialRepository.js'
import type {
  testimonialCreateSchema,
  testimonialUpdateSchema,
} from '../schemas/index.js'

class TestimonialService {
  async list() {
    const items = await TestimonialRepository.findAll()
    return items.map(toTestimonialDto)
  }

  async create(input: z.infer<typeof testimonialCreateSchema>) {
    const id =
      input.id ??
      `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const item = await TestimonialRepository.create({
      id,
      quote: input.quote,
      name: input.name,
      trip: input.trip,
      rating: input.rating,
      sortOrder: input.sortOrder,
    })
    return toTestimonialDto(item)
  }

  async updateById(id: string, input: z.infer<typeof testimonialUpdateSchema>) {
    const existing = await TestimonialRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Testimonial not found')
    }

    const item = await TestimonialRepository.updateById(id, {
      ...(input.quote !== undefined ? { quote: input.quote } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.trip !== undefined ? { trip: input.trip } : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    return toTestimonialDto(item)
  }

  async deleteById(id: string) {
    const existing = await TestimonialRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Testimonial not found')
    }
    await TestimonialRepository.deleteById(id)
  }
}

export default new TestimonialService()
