import { z } from 'zod'

import { STORY_COUNT, TRAVEL_TIP_COUNT } from '../lib/tourContent.js'
import { TOUR_REGIONS } from '../lib/tourRegion.js'

const RESERVED_TOUR_SLUGS = new Set(['search'])

export const slugParamSchema = z.object({
    slug: z.string().min(1),
})

export const idParamSchema = z.object({
    id: z.string().min(1),
})

export const tourExperienceSchema = z.object({
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
    summary: z.string().min(1),
    body: z.string().min(1),
    image: z.string().min(1),
})

export const tourCreateSchema = z.object({
    id: z.string().min(1).optional(),
    slug: z
        .string()
        .min(1)
        .refine((value) => !RESERVED_TOUR_SLUGS.has(value), 'This URL slug is reserved'),
    title: z.string().min(1),
    tagline: z.string().min(1),
    shortDescription: z.string().min(1),
    coverImage: z.string().min(1),
    location: z.string().min(1),
    experiences: z.array(tourExperienceSchema).min(1),
    storyTitles: z.array(z.string().min(1)).length(STORY_COUNT),
    travelTips: z.array(z.string().min(1)).length(TRAVEL_TIP_COUNT),
    featured: z.boolean().default(false),
    region: z.enum(TOUR_REGIONS).default('other'),
})

export const tourUpdateSchema = tourCreateSchema
    .partial()
    .omit({ id: true })
    .extend({ region: z.enum(TOUR_REGIONS).optional() })

export const tourMoveSchema = z
    .object({
        beforeSlug: z.string().min(1).optional(),
        afterSlug: z.string().min(1).optional(),
    })
    .refine((value) => value.beforeSlug || value.afterSlug, 'A neighbouring destination is required')

export const tourSearchSchema = z.object({
    q: z.string().trim().max(200).default(''),
    region: z.enum([...TOUR_REGIONS, 'all']).default('all'),
    featured: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => value === 'true'),
    sort: z.enum(['custom', 'name', 'location', 'region', 'featured', 'updated']).default('custom'),
    dir: z.enum(['asc', 'desc']).default('asc'),
    cursor: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const merchCreateSchema = z.object({
    id: z.string().min(1).optional(),
    slug: z.string().min(1),
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
    currency: z.string().default('USD'),
    category: z.string().min(1),
    coverImage: z.string().min(1),
    gallery: z.array(z.string()).default([]),
    sizes: z.array(z.string()).default([]),
    inStock: z.boolean().default(true),
})

export const merchUpdateSchema = merchCreateSchema.partial().omit({ id: true })

export const partnerCreateSchema = z.object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    logoSrc: z.string().min(1),
    sortOrder: z.number().int().default(0),
})

export const partnerUpdateSchema = partnerCreateSchema.partial().omit({ id: true })

export const testimonialCreateSchema = z.object({
    id: z.string().min(1).optional(),
    quote: z.string().min(1),
    name: z.string().min(1),
    trip: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    sortOrder: z.number().int().default(0),
})

export const testimonialUpdateSchema = testimonialCreateSchema
    .partial()
    .omit({ id: true })

export const faqCategoryCreateSchema = z.object({
    name: z.string().trim().min(1).max(120),
})

export const faqCategoryUpdateSchema = faqCategoryCreateSchema

export const faqCategoryReorderSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
})

export const faqCreateSchema = z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(5000),
    categoryIds: z.array(z.string().min(1)).default([]),
})

export const faqUpdateSchema = faqCreateSchema.partial()

export const faqTopAddSchema = z.object({
    faqId: z.string().min(1),
})

export const bootstrapSchema = z.object({
    email: z.string().email().nullable().optional(),
    firstName: z.string().trim().min(1).max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).nullable().optional(),
    profilePicture: z.string().nullable().optional(),
})

export const updateMeSchema = z.object({
    firstName: z.string().trim().min(1).max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    profilePicture: z.string().nullable().optional(),
})

export const cartAddSchema = z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1).max(99).default(1),
    size: z.string().optional(),
})

export const cartUpdateSchema = z.object({
    qty: z.number().int().min(0).max(99),
})

const shortText = (max = 200) => z.string().trim().min(1).max(max)
const optionalText = (max = 200) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((value) => value || undefined)
const countText = z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().min(1).max(10))

const inquiryBase = {
    firstName: shortText(100),
    lastName: shortText(100),
    email: z.string().trim().email().max(254),
    phone: optionalText(40),
    honeypot: z.string().max(500).optional(),
}

export const askVisaTypes = [
    'U.S. Tourist Visa',
    'U.S. Fiancé(e) Visa',
    'U.S. K-2 Visa',
    'U.S. J-1 Exchange Visitor Visa',
    'U.S. R-1 Religious Worker Visa',
    'U.S. R-2 Dependent Visa',
    'U.S. P-1 Visa',
    'U.S. P-2 Visa',
    'U.S. E-2 Treaty Investor Visa',
    'Not Sure Yet',
    'General Travel Question',
    'Other',
] as const

export const inquirySchema = z.discriminatedUnion('kind', [
    z.object({
        ...inquiryBase,
        kind: z.literal('question'),
        visaType: z.enum(askVisaTypes),
        question: shortText(5000),
    }),
    z.object({
        ...inquiryBase,
        kind: z.literal('contact'),
        interest: optionalText(),
        message: shortText(5000),
    }),
    z.object({
        ...inquiryBase,
        kind: z.literal('custom-tour'),
        destination: shortText(),
        travelDates: optionalText(),
        travelers: countText,
        tripLength: optionalText(),
        flights: shortText(50),
        addOns: optionalText(300),
        notes: optionalText(5000),
    }),
    z.object({
        ...inquiryBase,
        kind: z.literal('flights'),
        origin: shortText(),
        destination: shortText(),
        departDate: shortText(30),
        returnDate: optionalText(30),
        passengers: countText,
        cabin: optionalText(50),
        notes: optionalText(5000),
    }),
    z.object({
        ...inquiryBase,
        kind: z.literal('hotels'),
        destination: shortText(),
        checkIn: shortText(30),
        checkOut: shortText(30),
        rooms: countText,
        guests: countText,
        notes: optionalText(5000),
    }),
    z.object({
        ...inquiryBase,
        kind: z.literal('cars'),
        pickup: shortText(),
        dropoff: optionalText(),
        pickupDate: shortText(30),
        passengers: countText,
        notes: optionalText(5000),
    }),
])

export type InquiryInput = z.infer<typeof inquirySchema>
