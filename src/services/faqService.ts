import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import FaqRepository, { type FaqWithCategories } from '../repositories/faqRepository.js'
import type {
    faqCategoryCreateSchema,
    faqCategoryReorderSchema,
    faqCategoryUpdateSchema,
    faqCreateSchema,
    faqUpdateSchema,
} from '../schemas/index.js'

export const TOP_FAQ_LIMIT = 5

type FaqItemDto = { id: string; question: string; answer: string }

function byQuestion(a: { question: string }, b: { question: string }) {
    return a.question.localeCompare(b.question, undefined, { sensitivity: 'base' })
}

function toFaqItem(faq: FaqItemDto): FaqItemDto {
    return { id: faq.id, question: faq.question, answer: faq.answer }
}

function toAdminFaq(faq: FaqWithCategories) {
    return {
        ...toFaqItem(faq),
        categoryIds: faq.categories.map((link) => link.categoryId),
        updatedAt: faq.updatedAt.toISOString(),
    }
}

class FaqService {
    async listPublic() {
        const [categories, faqs, top] = await Promise.all([
            FaqRepository.findAllCategories(),
            FaqRepository.findAllFaqs(),
            FaqRepository.findTopEntries(),
        ])
        const sorted = [...faqs].sort(byQuestion)
        const byId = new Map(faqs.map((faq) => [faq.id, faq]))

        return {
            categories: categories
                .map((category) => ({
                    id: category.id,
                    name: category.name,
                    faqs: sorted
                        .filter((faq) => faq.categories.some((link) => link.categoryId === category.id))
                        .map(toFaqItem),
                }))
                .filter((category) => category.faqs.length > 0),
            top: top.flatMap((entry) => {
                const faq = byId.get(entry.faqId)
                return faq ? [toFaqItem(faq)] : []
            }),
        }
    }

    async listAdmin() {
        const [categories, faqs, top] = await Promise.all([
            FaqRepository.findAllCategories(),
            FaqRepository.findAllFaqs(),
            FaqRepository.findTopEntries(),
        ])
        const counts = new Map<string, number>()
        for (const faq of faqs) {
            for (const link of faq.categories) {
                counts.set(link.categoryId, (counts.get(link.categoryId) ?? 0) + 1)
            }
        }

        return {
            categories: categories.map((category) => ({
                id: category.id,
                name: category.name,
                faqCount: counts.get(category.id) ?? 0,
            })),
            faqs: [...faqs].sort(byQuestion).map(toAdminFaq),
            topIds: top.map((entry) => entry.faqId),
            topLimit: TOP_FAQ_LIMIT,
        }
    }

    async createCategory(input: z.infer<typeof faqCategoryCreateSchema>) {
        return FaqRepository.createCategory(input.name)
    }

    async updateCategory(id: string, input: z.infer<typeof faqCategoryUpdateSchema>) {
        await this.requireCategory(id)
        return FaqRepository.updateCategory(id, input.name)
    }

    async deleteCategory(id: string) {
        await this.requireCategory(id)
        await FaqRepository.deleteCategory(id)
    }

    async reorderCategories(input: z.infer<typeof faqCategoryReorderSchema>) {
        const unique = new Set(input.ids)
        const existing = await FaqRepository.findAllCategories()
        if (unique.size !== input.ids.length || unique.size !== existing.length) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Send every category exactly once')
        }
        if (existing.some((category) => !unique.has(category.id))) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category in order')
        }
        await FaqRepository.reorderCategories(input.ids)
    }

    async createFaq(input: z.infer<typeof faqCreateSchema>) {
        const categoryIds = await this.validCategoryIds(input.categoryIds)
        const faq = await FaqRepository.createFaq({ ...input, categoryIds })
        return toAdminFaq(faq)
    }

    async updateFaq(id: string, input: z.infer<typeof faqUpdateSchema>) {
        await this.requireFaq(id)
        const categoryIds =
            input.categoryIds !== undefined ? await this.validCategoryIds(input.categoryIds) : undefined
        const faq = await FaqRepository.updateFaq(id, { ...input, categoryIds })
        return toAdminFaq(faq)
    }

    async deleteFaq(id: string) {
        await this.requireFaq(id)
        await FaqRepository.deleteFaq(id)
    }

    async addTop(faqId: string) {
        await this.requireFaq(faqId)
        await FaqRepository.enqueueTop(faqId, TOP_FAQ_LIMIT)
    }

    async removeTop(faqId: string) {
        await FaqRepository.removeTop(faqId)
    }

    private async requireCategory(id: string) {
        const category = await FaqRepository.findCategoryById(id)
        if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found')
        return category
    }

    private async requireFaq(id: string) {
        const faq = await FaqRepository.findFaqById(id)
        if (!faq) throw new AppError(404, 'NOT_FOUND', 'FAQ not found')
        return faq
    }

    private async validCategoryIds(ids: string[]) {
        const unique = [...new Set(ids)]
        if (unique.length === 0) return unique
        const count = await FaqRepository.countCategoriesByIds(unique)
        if (count !== unique.length) {
            throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category')
        }
        return unique
    }
}

export default new FaqService()
