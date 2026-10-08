import type { MerchCategory, MerchProduct, Partner, Testimonial, Tour } from '../generated/prisma/client.js'

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
    priceCents: number
    currency: string
    categoryId: string
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

export type MerchProductWithCategory = MerchProduct & { category: MerchCategory }

export const MERCH_INCLUDE = { category: true } as const

export function toMerchCategoryDto(category: MerchCategory & { _count: { products: number } }) {
    return {
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        productCount: category._count.products,
    }
}

export function toMerchDto(product: MerchProductWithCategory): MerchDto {
    return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        price: formatMoney(product.priceCents, product.currency),
        priceCents: product.priceCents,
        currency: product.currency,
        categoryId: product.categoryId,
        category: product.category.name,
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
        url: partner.url,
        description: partner.description,
        logoSrc: partner.logoSrc,
        sortOrder: partner.sortOrder,
    }
}

export function toTestimonialDto(item: Testimonial) {
    return {
        id: item.id,
        quote: item.quote,
        name: item.name,
        trip: item.trip,
        rating: item.rating,
        sortOrder: item.sortOrder,
    }
}
