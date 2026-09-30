import type { MerchProduct, Partner, Testimonial, Tour } from '../generated/prisma/client.js'

import { formatMoney } from './money.js'

export type TourDto = {
    id: string
    slug: string
    title: string
    tagline: string
    shortDescription: string
    coverImage: string
    gallery: string[]
    duration: string
    startingPrice: string
    location: string
    highlights: string[]
    itinerary: { day: number; title: string; description: string }[]
    inclusions: string[]
    exclusions: string[]
    featured: boolean
}

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
    const itinerary = Array.isArray(tour.itinerary)
        ? (tour.itinerary as TourDto['itinerary'])
        : []

    return {
        id: tour.id,
        slug: tour.slug,
        title: tour.title,
        tagline: tour.tagline,
        shortDescription: tour.shortDescription,
        coverImage: tour.coverImage,
        gallery: tour.gallery,
        duration: tour.duration,
        startingPrice: tour.startingPrice,
        location: tour.location,
        highlights: tour.highlights,
        itinerary,
        inclusions: tour.inclusions,
        exclusions: tour.exclusions,
        featured: tour.featured,
    }
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
