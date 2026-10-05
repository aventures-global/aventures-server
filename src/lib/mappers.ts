import type { MerchProduct, Partner, Testimonial, Tour } from '../generated/prisma/client.js'

import { formatMoney } from './money.js'
import { LEGACY_EXPERIENCE_EYEBROWS, type TourExperience } from './tourContent.js'

export type TourDto = {
    id: string
    slug: string
    title: string
    tagline: string
    shortDescription: string
    coverImage: string
    location: string
    experiences: TourExperience[]
    storyTitles: string[]
    travelTips: string[]
    featured: boolean
    region: string
    sortOrder: number
    updatedAt: string
}

export const TOUR_LIST_SELECT = {
    id: true,
    slug: true,
    title: true,
    tagline: true,
    coverImage: true,
    location: true,
    featured: true,
    region: true,
    sortOrder: true,
    updatedAt: true,
} as const

export type TourListRow = Pick<Tour, keyof typeof TOUR_LIST_SELECT>

export type TourListDto = Omit<TourListRow, 'updatedAt'> & { updatedAt: string }

export type MerchDto = {
    id: string
    slug: string
    name: string
    tagline: string
    description: string
    price: string
    category: string
    coverImage: string
    gallery: string[]
    sizes?: string[]
    inStock: boolean
}

export function toTourDto(tour: Tour): TourDto {
    const experiences = Array.isArray(tour.experiences)
        ? (tour.experiences as Partial<TourExperience>[]).map((experience, index) => ({
              eyebrow: experience.eyebrow || (LEGACY_EXPERIENCE_EYEBROWS[index] ?? `Section ${index + 1}`),
              headline: experience.headline ?? '',
              summary: experience.summary ?? '',
              body: experience.body ?? '',
              image: experience.image ?? '',
          }))
        : []

    return {
        id: tour.id,
        slug: tour.slug,
        title: tour.title,
        tagline: tour.tagline,
        shortDescription: tour.shortDescription,
        coverImage: tour.coverImage,
        location: tour.location,
        experiences,
        storyTitles: tour.storyTitles,
        travelTips: tour.travelTips,
        featured: tour.featured,
        region: tour.region,
        sortOrder: tour.sortOrder,
        updatedAt: tour.updatedAt.toISOString(),
    }
}

export function toTourListDto(tour: TourListRow): TourListDto {
    return { ...tour, updatedAt: tour.updatedAt.toISOString() }
}

export function toMerchDto(product: MerchProduct): MerchDto {
    return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        price: formatMoney(product.priceCents, product.currency),
        category: product.category,
        coverImage: product.coverImage,
        gallery: product.gallery,
        ...(product.sizes.length > 0 ? { sizes: product.sizes } : {}),
        inStock: product.inStock,
    }
}

export function toPartnerDto(partner: Partner) {
    return {
        id: partner.id,
        name: partner.name,
        logoSrc: partner.logoSrc,
    }
}

export function toTestimonialDto(item: Testimonial) {
    return {
        id: item.id,
        quote: item.quote,
        name: item.name,
        trip: item.trip,
        rating: item.rating,
    }
}
