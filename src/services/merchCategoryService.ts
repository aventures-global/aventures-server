import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { toMerchCategoryDto } from '../lib/mappers.js'
import { slugify } from '../lib/slug.js'
import MerchCategoryRepository from '../repositories/merchCategoryRepository.js'
import type {
    merchCategoryCreateSchema,
    merchCategoryReorderSchema,
    merchCategoryUpdateSchema,
} from '../schemas/index.js'

class MerchCategoryService {
    async list() {
        const categories = await MerchCategoryRepository.findAll()
        return categories.map(toMerchCategoryDto)
    }

    async requireCategory(id: string) {
        const category = await MerchCategoryRepository.findById(id)
        if (!category) {
            throw new AppError(404, 'NOT_FOUND', 'Category not found')
        }
        return category
    }

    private async assertNameFree(name: string, exceptId?: string) {
        const existing = await MerchCategoryRepository.findByName(name)
        if (existing && existing.id !== exceptId) {
            throw new AppError(409, 'CONFLICT', `A category named “${existing.name}” already exists`)
        }
    }

    async create(input: z.infer<typeof merchCategoryCreateSchema>) {
        await this.assertNameFree(input.name)
        const base = slugify(input.name) || 'category'
        let id = base
        for (let n = 2; await MerchCategoryRepository.findById(id); n++) id = `${base}-${n}`
        return toMerchCategoryDto(await MerchCategoryRepository.create(id, input.name))
    }

    async rename(id: string, input: z.infer<typeof merchCategoryUpdateSchema>) {
        await this.requireCategory(id)
        await this.assertNameFree(input.name, id)
        return toMerchCategoryDto(await MerchCategoryRepository.rename(id, input.name))
    }

    async delete(id: string) {
        const category = await this.requireCategory(id)
        const count = category._count.products
        if (count > 0) {
            throw new AppError(
                409,
                'CONFLICT',
                `“${category.name}” is used by ${count} product${count === 1 ? '' : 's'}. Move them to another category first.`,
            )
        }
        await MerchCategoryRepository.delete(id)
    }

    async reorder(input: z.infer<typeof merchCategoryReorderSchema>) {
        const unique = new Set(input.ids)
        const existing = await MerchCategoryRepository.findAll()
        if (unique.size !== input.ids.length || unique.size !== existing.length) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Send every category exactly once')
        }
        if (existing.some((category) => !unique.has(category.id))) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category in order')
        }
        await MerchCategoryRepository.reorder(input.ids)
    }
}

export default new MerchCategoryService()
