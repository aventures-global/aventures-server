import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { toPartnerDto } from '../lib/mappers.js'
import PartnerRepository from '../repositories/partnerRepository.js'
import type { partnerCreateSchema, partnerUpdateSchema } from '../schemas/index.js'

class PartnerService {
  async list() {
    const partners = await PartnerRepository.findAll()
    return partners.map(toPartnerDto)
  }

  async create(input: z.infer<typeof partnerCreateSchema>) {
    const id =
      input.id ??
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    const existing = await PartnerRepository.findById(id)
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Partner already exists')
    }

    const partner = await PartnerRepository.create({
      id,
      name: input.name,
      logoSrc: input.logoSrc,
      sortOrder: input.sortOrder,
    })
    return toPartnerDto(partner)
  }

  async updateById(id: string, input: z.infer<typeof partnerUpdateSchema>) {
    const existing = await PartnerRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Partner not found')
    }

    const partner = await PartnerRepository.updateById(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.logoSrc !== undefined ? { logoSrc: input.logoSrc } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    return toPartnerDto(partner)
  }

  async deleteById(id: string) {
    const existing = await PartnerRepository.findById(id)
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Partner not found')
    }
    await PartnerRepository.deleteById(id)
  }
}

export default new PartnerService()
