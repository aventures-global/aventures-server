import type { Prisma } from '../generated/prisma/client.js'
import { AppError } from '../lib/errors.js'
import { correctQuery, fuzzyScore, splitWords } from '../lib/fuzzy.js'
import { geocode } from '../lib/geocoder.js'
import { haversineKm } from '../lib/geo.js'
import { toTourDto, toTourListDto } from '../lib/mappers.js'
import { resolveTourCoords } from '../lib/tourCoords.js'
import { buildTourSearchText } from '../lib/tourSearchText.js'
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
/** Places farther than this from every tour get no "closest journeys" suggestions. */
const NEARBY_MAX_KM = 1500
const SPELLING_MIN_SCORE = 0.7
const MAX_SUGGESTIONS = 3
/** Descriptive words shared by many tours, so they must not drive a "did you mean". */
const GENERIC_WORDS = new Set([
    'and', 'the', 'of', 'tour', 'tours', 'island', 'islands', 'coast', 'city', 'cities', 'life',
    'surf', 'hills', 'river', 'shore', 'lagoons', 'limestone', 'highlands', 'seasons', 'north',
    'countryside', 'journeys', 'discovery', 'escape', 'calling', 'serenity', 'surrounds',
])

async function coordsOrNull(location: string) {
    try {
        return await resolveTourCoords(location)
    } catch {
        return null
    }
}

function spellingText(tour: { title: string; location: string; slug: string }) {
    return splitWords(`${tour.title} ${tour.location} ${tour.slug}`)
        .filter((word) => !GENERIC_WORDS.has(word))
        .join(' ')
}

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
    const regions = input.regions.length > 0 ? input.regions : input.region !== 'all' ? [input.region] : []
    return {
        ...(regions.length === 1 ? { region: regions[0] } : {}),
        ...(regions.length > 1 ? { region: { in: regions } } : {}),
        ...(input.featured ? { featured: true } : {}),
        AND: tokens.map((token) => ({
            searchText: { contains: token, mode: 'insensitive' as const },
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
            items: items.map(toTourListDto),
            nextCursor: next < total && items.length > 0 ? next : null,
            total,
        }
    }

    /**
     * Fallback for searches with no results: tours whose names are a close spelling of
     * `q`, otherwise tours in the same country as the place `q` geocodes to, otherwise
     * tours within NEARBY_MAX_KM of it.
     */
    async suggest(q: string) {
        const tours = await TourRepository.findForSuggest()
        const spellQuery = splitWords(q).filter((word) => !GENERIC_WORDS.has(word)).join(' ')

        const spelled = tours
            .map((tour) => ({ tour, score: fuzzyScore(spellQuery, spellingText(tour)) }))
            .filter((entry) => entry.score >= SPELLING_MIN_SCORE)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_SUGGESTIONS)
        if (spelled.length > 0) {
            return {
                kind: 'spelling' as const,
                suggestion: correctQuery(spellQuery, spellingText(spelled[0].tour)),
                matches: spelled.map(({ tour: { lat, lng, ...tour } }) => toTourListDto(tour)),
            }
        }

        const place = await geocode(q)
        if (place) {
            const measured = tours
                .flatMap(({ lat, lng, ...tour }) =>
                    lat === null || lng === null
                        ? []
                        : [{ tour, distanceKm: haversineKm(place.lat, place.lng, lat, lng) }],
                )
                .sort((a, b) => a.distanceKm - b.distanceKm)

            const country = place.country?.toLowerCase()
            const inCountry = country
                ? measured.filter(({ tour }) => tour.location.toLowerCase().includes(country))
                : []
            if (inCountry.length > 0) {
                return {
                    kind: 'covered' as const,
                    place: q.trim(),
                    country: place.country!,
                    isCountry: place.placeType === 'country',
                    matches: inCountry.slice(0, MAX_SUGGESTIONS).map(({ tour }) => toTourListDto(tour)),
                }
            }

            const nearby = measured
                .filter((entry) => entry.distanceKm <= NEARBY_MAX_KM)
                .slice(0, MAX_SUGGESTIONS)
            if (nearby.length > 0) {
                return {
                    kind: 'nearby' as const,
                    place: q.trim(),
                    matches: nearby.map(({ tour, distanceKm }) => ({
                        ...toTourListDto(tour),
                        distanceKm: Math.round(distanceKm),
                    })),
                }
            }
        }

        return { kind: 'none' as const }
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
            location: input.location,
            experiences: input.experiences,
            storyTitles: input.storyTitles,
            travelTips: input.travelTips,
            featured: input.featured,
            region: input.region,
            sortOrder: (await TourRepository.maxSortOrder()) + 1,
            searchText: buildTourSearchText(input),
            ...(await coordsOrNull(input.location)),
        })
        return toTourDto(tour)
    }

    async updateBySlug(slug: string, input: z.infer<typeof tourUpdateSchema>) {
        const existing = await TourRepository.findBySlug(slug)
        if (!existing) {
            throw new AppError(404, 'NOT_FOUND', 'Tour not found')
        }
        const current = toTourDto(existing)
        const locationChanged = input.location !== undefined && input.location !== existing.location
        const coords = locationChanged ? await coordsOrNull(input.location!) : undefined
        const tour = await TourRepository.updateBySlug(slug, {
            ...(locationChanged ? { lat: coords?.lat ?? null, lng: coords?.lng ?? null } : {}),
            searchText: buildTourSearchText({
                title: input.title ?? current.title,
                tagline: input.tagline ?? current.tagline,
                shortDescription: input.shortDescription ?? current.shortDescription,
                location: input.location ?? current.location,
                slug: input.slug ?? current.slug,
                storyTitles: input.storyTitles ?? current.storyTitles,
                experiences: input.experiences ?? current.experiences,
            }),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
            ...(input.shortDescription !== undefined
                ? { shortDescription: input.shortDescription }
                : {}),
            ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.experiences !== undefined ? { experiences: input.experiences } : {}),
            ...(input.storyTitles !== undefined ? { storyTitles: input.storyTitles } : {}),
            ...(input.travelTips !== undefined ? { travelTips: input.travelTips } : {}),
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
