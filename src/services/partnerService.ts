import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { toPartnerDto } from '../lib/mappers.js'
import PartnerRepository from '../repositories/partnerRepository.js'
import type { partnerCreateSchema, partnerReorderSchema, partnerUpdateSchema } from '../schemas/index.js'

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
            url: input.url,
            description: input.description,
            logoSrc: input.logoSrc,
            sortOrder: input.sortOrder ?? (await PartnerRepository.nextSortOrder()),
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
            ...(input.url !== undefined ? { url: input.url } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.logoSrc !== undefined ? { logoSrc: input.logoSrc } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        })
        return toPartnerDto(partner)
    }

    async reorder(input: z.infer<typeof partnerReorderSchema>) {
        const unique = new Set(input.ids)
        const existing = await PartnerRepository.findAll()
        if (unique.size !== input.ids.length || unique.size !== existing.length) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Send every partner exactly once')
        }
        if (existing.some((item) => !unique.has(item.id))) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Unknown partner in order')
        }
        await PartnerRepository.reorder(input.ids)
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
