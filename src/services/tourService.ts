import type { Prisma } from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import { toTourDto } from '../lib/mappers.js'
import TourRepository from '../repositories/tourRepository.js'
import type {
    tourCreateSchema,
    tourMoveSchema,
    tourSearchSchema,
    tourUpdateSchema,
} from '../schemas/index.js'
import type { z } from 'zod'

type SearchInput = z.infer<typeof tourSearchSchema>

const MIN_GAP = 1e-6

const SEARCH_FIELDS = ['title', 'tagline', 'shortDescription', 'location', 'slug'] as const

function searchOrder(sort: SearchInput['sort'], dir: SearchInput['dir']) {
    const order: Prisma.TourOrderByWithRelationInput[] = (() => {
        switch (sort) {
            case 'name':
                return [{ title: dir }]
            case 'location':
                return [{ location: dir }, { title: 'asc' }]
            case 'region':
                return [{ region: dir }, { sortOrder: 'asc' }]
            case 'featured':
                return [{ featured: dir === 'asc' ? 'desc' : 'asc' }, { sortOrder: 'asc' }]
            case 'updated':
                return [{ updatedAt: dir }]
            case 'custom':
            default:
                return [{ sortOrder: dir }]
        }
    })()
    return [...order, { id: 'asc' } as const]
}

function searchWhere(input: SearchInput): Prisma.TourWhereInput {
    const tokens = input.q.split(/\s+/).filter(Boolean)
    return {
        ...(input.region !== 'all' ? { region: input.region } : {}),
        ...(input.featured ? { featured: true } : {}),
        AND: tokens.map((token) => ({
            OR: SEARCH_FIELDS.map((field) => ({
                [field]: { contains: token, mode: 'insensitive' as const },
            })),
        })),
    }
}

class TourService {
    async search(input: SearchInput) {
        const { items, total } = await TourRepository.search({
            where: searchWhere(input),
            orderBy: searchOrder(input.sort, input.dir),
            skip: input.cursor,
            take: input.limit,
        })
        const next = input.cursor + items.length
        return {
            items: items.map(toTourDto),
            nextCursor: next < total && items.length > 0 ? next : null,
            total,
        }
    }

    async move(slug: string, input: z.infer<typeof tourMoveSchema>) {
        const tour = await TourRepository.findBySlug(slug)
        if (!tour) throw new AppError(404, 'NOT_FOUND', 'Tour not found')

        const anchorSlug = input.beforeSlug ?? input.afterSlug!
        if (anchorSlug === slug) {
            throw new AppError(400, 'INVALID_MOVE', 'A destination cannot be placed next to itself')
        }
        const placeAfterAnchor = Boolean(input.beforeSlug)

        for (let attempt = 0; attempt < 2; attempt++) {
            const anchor = await TourRepository.findBySlug(anchorSlug)
            if (!anchor) throw new AppError(404, 'NOT_FOUND', 'Neighbouring tour not found')

            const neighbor = await TourRepository.findNeighbor(
                anchor,
                placeAfterAnchor ? 'after' : 'before',
                tour.id,
            )

            if (!neighbor) {
                const sortOrder = anchor.sortOrder + (placeAfterAnchor ? 1 : -1)
                return toTourDto(await TourRepository.setSortOrder(slug, sortOrder))
            }

            if (Math.abs(neighbor.sortOrder - anchor.sortOrder) >= MIN_GAP) {
                const sortOrder = (anchor.sortOrder + neighbor.sortOrder) / 2
                return toTourDto(await TourRepository.setSortOrder(slug, sortOrder))
            }

            await TourRepository.renumber()
        }

        throw new AppError(409, 'CONFLICT', 'Could not reorder destinations, try again')
    }

    async list() {
        const tours = await TourRepository.findAll()
        return tours.map(toTourDto)
    }

    async listFeatured() {
        const tours = await TourRepository.findFeatured()
        return tours.map(toTourDto)
    }

    async getBySlug(slug: string) {
        const tour = await TourRepository.findBySlug(slug)
        if (!tour) {
            throw new AppError(404, 'NOT_FOUND', 'Tour not found')
        }
        return toTourDto(tour)
    }

    async create(input: z.infer<typeof tourCreateSchema>) {
        const id = input.id ?? input.slug
        const existing = await TourRepository.findBySlug(input.slug)
        if (existing) {
            throw new AppError(409, 'CONFLICT', 'Tour slug already exists')
        }

        const tour = await TourRepository.create({
            id,
            slug: input.slug,
            title: input.title,
            tagline: input.tagline,
            shortDescription: input.shortDescription,
            coverImage: input.coverImage,
            gallery: input.gallery,
            duration: input.duration,
            startingPrice: input.startingPrice,
            location: input.location,
            highlights: input.highlights,
            itinerary: input.itinerary,
            inclusions: input.inclusions,
            exclusions: input.exclusions,
            featured: input.featured,
            region: input.region,
            sortOrder: (await TourRepository.maxSortOrder()) + 1,
        })
        return toTourDto(tour)
    }

    async updateBySlug(slug: string, input: z.infer<typeof tourUpdateSchema>) {
        await this.getBySlug(slug)
        const tour = await TourRepository.updateBySlug(slug, {
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
            ...(input.shortDescription !== undefined
                ? { shortDescription: input.shortDescription }
                : {}),
            ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
            ...(input.gallery !== undefined ? { gallery: input.gallery } : {}),
            ...(input.duration !== undefined ? { duration: input.duration } : {}),
            ...(input.startingPrice !== undefined
                ? { startingPrice: input.startingPrice }
                : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.highlights !== undefined ? { highlights: input.highlights } : {}),
            ...(input.itinerary !== undefined ? { itinerary: input.itinerary } : {}),
            ...(input.inclusions !== undefined ? { inclusions: input.inclusions } : {}),
            ...(input.exclusions !== undefined ? { exclusions: input.exclusions } : {}),
            ...(input.featured !== undefined ? { featured: input.featured } : {}),
            ...(input.region !== undefined ? { region: input.region } : {}),
        })
        return toTourDto(tour)
    }

    async deleteBySlug(slug: string) {
        await this.getBySlug(slug)
        await TourRepository.deleteBySlug(slug)
    }
}

export default new TourService()
