import { AppError } from '../lib/errors.js'
import type { SitePageContentMap, SitePageId } from '../lib/sitePageContent.js'
import SitePageRepository from '../repositories/sitePageRepository.js'
import { sitePageSchemas } from '../schemas/index.js'

type SitePageRow = NonNullable<Awaited<ReturnType<typeof SitePageRepository.findById>>>

function toDto<Id extends SitePageId>(row: SitePageRow) {
    return {
        id: row.id as Id,
        content: row.content as unknown as SitePageContentMap[Id],
        updatedAt: row.updatedAt.toISOString(),
    }
}

class SitePageService {
    async get(id: SitePageId) {
        return toDto(await this.require(id))
    }

    async replace(id: SitePageId, body: unknown) {
        await this.require(id)
        const result = sitePageSchemas[id].safeParse(body)
        if (!result.success) {
            const message = result.error.issues
                .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
                .join('; ')
            throw new AppError(400, 'VALIDATION_ERROR', message || 'Invalid page content')
        }
        return toDto(await SitePageRepository.updateContent(id, result.data))
    }

    private async require(id: SitePageId) {
        const row = await SitePageRepository.findById(id)
        if (!row) throw new AppError(404, 'NOT_FOUND', 'This page has not been seeded yet')
        return row
    }
}

export default new SitePageService()
