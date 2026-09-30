import { AppError } from '../lib/errors.js'
import { toTourDto } from '../lib/mappers.js'
import TourRepository from '../repositories/tourRepository.js'
import type { tourCreateSchema, tourUpdateSchema } from '../schemas/index.js'
import type { z } from 'zod'

class TourService {
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
        })
        return toTourDto(tour)
    }

    async deleteBySlug(slug: string) {
        await this.getBySlug(slug)
        await TourRepository.deleteBySlug(slug)
    }
}

export default new TourService()
