import type { z } from 'zod'

import { AppError } from '../lib/errors.js'
import { keyForPublicUrl, setDownloadName } from '../lib/storage.js'
import type { VisaCatalogContent, VisaId, VisaPageSlug, VisaServiceContent } from '../lib/visaContent.js'
import FaqRepository from '../repositories/faqRepository.js'
import VisaRepository from '../repositories/visaRepository.js'
import type {
    visaFinderUpdateSchema,
    visaPageUpdateSchema,
    visaServiceUpdateSchema,
} from '../schemas/index.js'

type FaqLinkFields = Pick<
    VisaServiceContent,
    'faqCategoryId' | 'faqCategory' | 'introFaqId' | 'introQuestion' | 'qualifyFaqId' | 'qualifyQuestion'
>

function sameIds(a: { id: string }[], b: { id: string }[]) {
    if (a.length !== b.length) return false
    const ids = new Set(a.map((item) => item.id))
    return b.every((item) => ids.has(item.id))
}

class VisaService {
    async getCatalog() {
        return this.requireCatalog()
    }

    async updatePage(slug: VisaPageSlug, input: z.infer<typeof visaPageUpdateSchema>) {
        const catalog = await this.requireCatalog()
        const pages = catalog.pages.map((page) => (page.slug === slug ? { ...page, ...input } : page))
        await VisaRepository.update({ pages })
        return { ...catalog, pages }
    }

    async updateService(id: VisaId, input: z.infer<typeof visaServiceUpdateSchema>) {
        const catalog = await this.requireCatalog()
        const current = catalog.services.find((service) => service.id === id)
        if (!current) throw new AppError(404, 'NOT_FOUND', 'Visa service not found')

        const { faqCategoryId, introFaqId, qualifyFaqId, ...fields } = input
        const touchesFaqs = faqCategoryId !== undefined || introFaqId !== undefined || qualifyFaqId !== undefined
        const categoryChanged = faqCategoryId !== undefined && faqCategoryId !== current.faqCategoryId
        const keep = (next: string | null | undefined, existing: string | null) =>
            next !== undefined ? next : categoryChanged ? null : existing
        const faqLinks = touchesFaqs
            ? await this.resolveFaqLinks({
                  faqCategoryId: faqCategoryId !== undefined ? faqCategoryId : current.faqCategoryId,
                  introFaqId: keep(introFaqId, current.introFaqId),
                  qualifyFaqId: keep(qualifyFaqId, current.qualifyFaqId),
              })
            : {}
        const next: VisaServiceContent = { ...current, ...fields, ...faqLinks }

        if (next.anchor !== current.anchor) {
            const page = catalog.pages.find((p) => p.visas.includes(id))
            const clash = catalog.services.some(
                (service) => service.id !== id && page?.visas.includes(service.id) && service.anchor === next.anchor,
            )
            if (clash) throw new AppError(400, 'VALIDATION_ERROR', 'Another visa on this page uses that section id')
        }

        const pdf = next.checklistPdf
        if (pdf.href !== current.checklistPdf.href || pdf.downloadName !== current.checklistPdf.downloadName) {
            const key = keyForPublicUrl(pdf.href)
            if (key) {
                try {
                    await setDownloadName(key, pdf.downloadName)
                } catch {
                    throw new AppError(502, 'STORAGE_ERROR', 'Could not update the PDF file name. Please try again.')
                }
            }
        }

        const services = catalog.services.map((service) => (service.id === id ? next : service))
        await VisaRepository.update({ services })
        return { ...catalog, services }
    }

    async updateFinder(input: z.infer<typeof visaFinderUpdateSchema>) {
        const catalog = await this.requireCatalog()
        const finder = { ...catalog.finder }

        if (input.eyebrow !== undefined) finder.eyebrow = input.eyebrow
        if (input.heading !== undefined) finder.heading = input.heading
        if (input.disclaimer !== undefined) finder.disclaimer = input.disclaimer
        if (input.roles) finder.roles = input.roles
        if (input.readiness) finder.readiness = input.readiness
        if (input.notes) finder.notes = input.notes
        if (input.touristNotes) finder.touristNotes = input.touristNotes

        if (input.purpose) {
            if (!sameIds(input.purpose.options, finder.purpose.options)) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Purpose answers can be relabelled, not added or removed')
            }
            const labels = new Map(input.purpose.options.map((option) => [option.id, option.label]))
            finder.purpose = {
                title: input.purpose.title,
                options: finder.purpose.options.map((option) => ({ ...option, label: labels.get(option.id)! })),
            }
        }

        if (input.exploreLinks) {
            if (!sameIds(input.exploreLinks, finder.exploreLinks)) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Send both explore links')
            }
            const byId = new Map(input.exploreLinks.map((link) => [link.id, link]))
            finder.exploreLinks = finder.exploreLinks.map((link) => {
                const edit = byId.get(link.id)!
                return { ...link, label: edit.label, note: edit.note }
            })
        }

        await VisaRepository.update({ finder })
        return { ...catalog, finder }
    }

    private async requireCatalog(): Promise<VisaCatalogContent> {
        const catalog = await VisaRepository.find()
        if (!catalog) throw new AppError(404, 'NOT_FOUND', 'The visa catalog has not been seeded yet')
        return catalog
    }

    private async resolveFaqLinks(ids: {
        faqCategoryId: string | null
        introFaqId: string | null
        qualifyFaqId: string | null
    }): Promise<FaqLinkFields> {
        if (!ids.faqCategoryId) {
            if (ids.introFaqId || ids.qualifyFaqId) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Choose an FAQ category before choosing its questions')
            }
            return {
                faqCategoryId: null,
                faqCategory: '',
                introFaqId: null,
                introQuestion: '',
                qualifyFaqId: null,
                qualifyQuestion: '',
            }
        }

        const category = await FaqRepository.findCategoryById(ids.faqCategoryId)
        if (!category) throw new AppError(400, 'VALIDATION_ERROR', 'Unknown FAQ category')

        const question = async (faqId: string | null, label: string) => {
            if (!faqId) return ''
            const faq = await FaqRepository.findFaqById(faqId)
            if (!faq || !faq.categories.some((link) => link.categoryId === category.id)) {
                throw new AppError(400, 'VALIDATION_ERROR', `The ${label} FAQ must belong to “${category.name}”`)
            }
            return faq.question
        }

        return {
            faqCategoryId: category.id,
            faqCategory: category.name,
            introFaqId: ids.introFaqId,
            introQuestion: await question(ids.introFaqId, 'introduction'),
            qualifyFaqId: ids.qualifyFaqId,
            qualifyQuestion: await question(ids.qualifyFaqId, '“who it’s for”'),
        }
    }
}

export default new VisaService()
