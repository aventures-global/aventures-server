import { z } from 'zod'

import { CAPABILITIES } from '../lib/permissions.js'
import { SITE_PAGE_IDS } from '../lib/sitePageContent.js'
import { STORY_COUNT, TRAVEL_TIP_COUNT } from '../lib/tourContent.js'
import { TOUR_REGIONS } from '../lib/tourRegion.js'
import {
    EXPLORE_LINK_IDS,
    FINDER_PATH_IDS,
    READINESS_IDS,
    VISA_IDS,
    VISA_PAGE_SLUGS,
} from '../lib/visaContent.js'

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
    regions: z
        .string()
        .optional()
        .transform((value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []))
        .pipe(z.array(z.enum(TOUR_REGIONS))),
    featured: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => value === 'true'),
    sort: z.enum(['custom', 'name', 'location', 'region', 'featured', 'updated']).default('custom'),
    dir: z.enum(['asc', 'desc']).default('asc'),
    cursor: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const tourSuggestSchema = z.object({
    q: z.string().trim().min(3, 'Query must be at least 3 characters').max(80),
})

export const merchCreateSchema = z.object({
    id: z.string().min(1).optional(),
    slug: z.string().min(1),
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
    currency: z.string().default('USD'),
    categoryId: z.string().min(1),
    coverImage: z.string().min(1),
    gallery: z.array(z.string()).default([]),
    sizes: z.array(z.string()).default([]),
    inStock: z.boolean().default(true),
})

export const merchUpdateSchema = merchCreateSchema.partial().omit({ id: true })

export const merchCategoryCreateSchema = z.object({
    name: z.string().trim().min(1).max(60),
})

export const merchCategoryUpdateSchema = merchCategoryCreateSchema

export const merchCategoryReorderSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
})

export const partnerCreateSchema = z.object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(120),
    url: z.string().trim().url().max(300),
    description: z.string().trim().max(300).default(''),
    logoSrc: z.string().trim().default(''),
    sortOrder: z.number().int().optional(),
})

export const partnerUpdateSchema = partnerCreateSchema.partial().omit({ id: true })

export const partnerReorderSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
})

export const testimonialCreateSchema = z.object({
    id: z.string().min(1).optional(),
    quote: z.string().trim().min(1).max(1000),
    name: z.string().trim().min(1).max(120),
    trip: z.string().trim().min(1).max(120),
    rating: z.number().int().min(1).max(5),
    sortOrder: z.number().int().optional(),
})

export const testimonialUpdateSchema = testimonialCreateSchema
    .partial()
    .omit({ id: true })

export const testimonialReorderSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
})

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

const visaText = (max: number) => z.string().trim().min(1, 'Text cannot be empty').max(max)
const optionId = z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Option ids use lowercase letters, numbers, and dashes')
    .max(60)

function uniqueIds(options: { id: string }[]) {
    return new Set(options.map((option) => option.id)).size === options.length
}

export const visaPageSlugParamSchema = z.object({ slug: z.enum(VISA_PAGE_SLUGS) })
export const visaIdParamSchema = z.object({ id: z.enum(VISA_IDS) })

export const visaPageUpdateSchema = z.object({
    title: visaText(160).optional(),
    description: visaText(400).optional(),
})

export const visaChecklistSchema = z.object({
    tagline: visaText(200),
    intro: z.string().trim().max(1000),
    groups: z
        .array(z.object({ title: visaText(160), items: z.array(visaText(500)).min(1).max(40) }))
        .min(1)
        .max(12),
    reminder: visaText(2000),
})

export const visaServiceUpdateSchema = z
    .object({
        title: visaText(120),
        shortLabel: visaText(60),
        description: visaText(600),
        anchor: optionId,
        category: visaText(40),
        askVisaType: z.enum(askVisaTypes),
        faqCategoryId: z.string().min(1).nullable(),
        introFaqId: z.string().min(1).nullable(),
        qualifyFaqId: z.string().min(1).nullable(),
        checklist: visaChecklistSchema,
        checklistPdf: z.object({ href: visaText(1000), downloadName: visaText(200) }),
    })
    .partial()

const roleQuestionSchema = z.object({
    title: visaText(300),
    options: z
        .array(z.object({ id: optionId, label: visaText(300), visa: z.enum(VISA_IDS).nullable() }))
        .min(1)
        .max(12)
        .refine(uniqueIds, 'Each answer needs a different id'),
})

const readinessQuestionSchema = z.object({
    title: visaText(300),
    options: z
        .array(z.object({ id: z.enum(READINESS_IDS), label: visaText(200) }))
        .length(READINESS_IDS.length)
        .refine(uniqueIds, 'Each readiness answer must appear once'),
})

const readinessNotesSchema = z.record(z.enum(READINESS_IDS), visaText(600))

export const visaFinderUpdateSchema = z
    .object({
        eyebrow: visaText(60),
        heading: visaText(160),
        disclaimer: visaText(600),
        purpose: z.object({
            title: visaText(300),
            options: z.array(z.object({ id: optionId, label: visaText(300) })).min(1),
        }),
        roles: z.record(z.enum(FINDER_PATH_IDS), roleQuestionSchema),
        readiness: z.record(z.enum(VISA_IDS), readinessQuestionSchema),
        notes: readinessNotesSchema,
        touristNotes: readinessNotesSchema,
        exploreLinks: z.array(
            z.object({ id: z.enum(EXPLORE_LINK_IDS), label: visaText(80), note: visaText(300) }),
        ),
    })
    .partial()

const pageText = (max: number) => z.string().trim().min(1, 'Text cannot be empty').max(max)
const pageList = (max: number, count = 30) => z.array(pageText(max)).min(1).max(count)
const titledItems = z
    .array(z.object({ title: pageText(120), description: pageText(600) }))
    .min(1)
    .max(12)

export const sitePageIdParamSchema = z.object({ id: z.enum(SITE_PAGE_IDS) })

const homePageSchema = z.object({
    hero: z.object({ title: pageText(80), subtitle: pageText(200), ctaLabel: pageText(60) }),
    story: z.object({ eyebrow: pageText(60), title: pageText(160), body: pageText(2000), linkLabel: pageText(60) }),
    whyUs: z.object({ eyebrow: pageText(60), title: pageText(160), points: pageList(80, 12) }),
})

const aboutPageSchema = z.object({
    intro: pageText(600),
    whyUs: z.object({
        eyebrow: pageText(60),
        title: pageText(160),
        intro: pageText(2000),
        pillars: titledItems,
        promise: pageList(80, 12),
        quote: pageText(400),
    }),
    founder: z.object({
        eyebrow: pageText(60),
        title: pageText(160),
        intro: pageText(2000),
        name: pageText(120),
        role: pageText(120),
        story: pageText(3000),
        whyItMatters: pageText(3000),
        quote: pageText(400),
    }),
    origin: z.object({
        eyebrow: pageText(60),
        title: pageText(160),
        intro: pageText(2000),
        story: pageText(3000),
        values: titledItems,
        mission: pageText(600),
        vision: pageText(600),
    }),
    transparency: z.object({
        eyebrow: pageText(60),
        title: pageText(160),
        intro: pageText(2000),
        principle: pageText(300),
        contact: z.object({
            address: pageText(200),
            email: z.string().trim().email().max(254),
            phone: pageText(40),
        }),
        visas: pageList(80),
        support: pageList(300),
        disclaimer: pageText(2000),
        footnote: pageText(1000),
    }),
})

const legalPageSchema = z.object({
    subtitle: pageText(200),
    intro: pageText(4000),
    lastUpdated: pageText(40),
    sections: z
        .array(
            z.object({
                id: optionId,
                label: pageText(60),
                title: pageText(160),
                body: pageText(10000),
            }),
        )
        .min(1)
        .max(30)
        .refine(uniqueIds, 'Each section needs a different id'),
})

export const sitePageSchemas = {
    home: homePageSchema,
    about: aboutPageSchema,
    privacy: legalPageSchema,
    terms: legalPageSchema,
} satisfies Record<(typeof SITE_PAGE_IDS)[number], z.ZodType>

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

export const adminUserListSchema = z.object({
    q: z.string().trim().max(200).default(''),
    /** `team` lists staff and admins, `customers` lists website accounts, `all` is the super admin's invite search. */
    scope: z.enum(['team', 'customers', 'all']).default('team'),
    role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'all']).default('all'),
    sort: z.enum(['createdAt', 'email', 'role']).default('createdAt'),
    dir: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const adminUserUpdateSchema = updateMeSchema.omit({ profilePicture: true })

export const adminUserRoleSchema = z.object({
    role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
})

export const pageQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const preferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    accent: z.enum(['royal', 'emerald', 'burgundy', 'slate', 'gold']),
    font: z.enum(['poppins', 'inter', 'system', 'serif']),
    textSize: z.enum(['small', 'default', 'large']),
    density: z.enum(['comfortable', 'compact']),
    motion: z.enum(['system', 'reduce', 'full']),
})

export const preferencesUpdateSchema = preferencesSchema.partial()

const handle = z.string().trim().max(60)
const socialUrl = z.union([z.literal(''), z.string().trim().url().max(300)])

export const businessSettingsSchema = z.object({
    email: z.string().trim().email().max(200),
    phoneDisplay: z.string().trim().min(1).max(40),
    addressLines: z.array(z.string().trim().max(120)).min(1).max(4),
    facebookUrl: socialUrl,
    instagramUrl: socialUrl,
    tiktokUrl: socialUrl,
    facebookHandle: handle,
    instagramHandle: handle,
    tiktokHandle: handle,
})

export const rolePermissionsSchema = z.object({
    STAFF: z.array(z.enum(CAPABILITIES)),
    ADMIN: z.array(z.enum(CAPABILITIES)),
})

export const invitationCreateSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['STAFF', 'ADMIN']),
})

export const invitationListSchema = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED', 'all']).default('PENDING'),
    userId: z.string().min(1).optional(),
})

export const invitationTokenSchema = z.object({
    token: z.string().min(20).max(200),
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
        lastName: optionalText(100),
        kind: z.literal('consultation'),
        service: optionalText(),
        message: shortText(5000),
    }),
    z.object({
        ...inquiryBase,
        lastName: optionalText(100),
        kind: z.literal('onboarding'),
        contactMethod: optionalText(100),
        service: shortText(),
        destination: shortText(),
        departure: optionalText(40),
        returnDate: optionalText(40),
        flexibleDates: optionalText(40),
        duration: optionalText(60),
        group: optionalText(60),
        adults: optionalText(10),
        children: optionalText(10),
        groupSize: optionalText(20),
        budget: optionalText(60),
        budgetType: optionalText(40),
        accommodation: optionalText(60),
        accommodationNeeds: optionalText(300),
        interests: optionalText(500),
        hasPlans: optionalText(60),
        plannedPlaces: optionalText(2000),
        flightPriority: optionalText(60),
        cabin: optionalText(60),
        baggage: optionalText(60),
        transportation: optionalText(300),
        visaType: optionalText(80),
        visaPurpose: optionalText(80),
        visaStatus: optionalText(80),
        passportStatus: optionalText(100),
        passportExpiry: optionalText(40),
        previousVisa: optionalText(200),
        appointment: optionalText(200),
        visaHelp: optionalText(2000),
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

export const FILE_SPACES = ['CUSTOMER', 'INTERNAL'] as const
export const DOCUMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export const DOCUMENT_CATEGORIES = ['PASSPORT', 'ID', 'VISA', 'SUPPORTING', 'OTHER'] as const

export const documentListSchema = z.object({
    space: z.enum(FILE_SPACES),
    ownerUserId: z.string().min(1).optional(),
    folderId: z
        .string()
        .optional()
        .transform((value) => (value === undefined || value === '' || value === 'root' ? null : value)),
    q: z.string().trim().max(200).default(''),
    category: z.enum([...DOCUMENT_CATEGORIES, 'all']).default('all'),
    status: z.enum([...DOCUMENT_STATUSES, 'all']).default('all'),
})

export const folderCreateSchema = z.object({
    space: z.enum(FILE_SPACES),
    name: z.string().trim().min(1).max(120),
    parentId: z.string().min(1).nullable().optional(),
    ownerUserId: z.string().min(1).optional(),
})

export const folderRenameSchema = z.object({
    name: z.string().trim().min(1).max(120),
})

export const fileUpdateSchema = z
    .object({
        displayName: z.string().trim().min(1).max(240).optional(),
        category: z.enum(DOCUMENT_CATEGORIES).optional(),
        status: z.enum(DOCUMENT_STATUSES).optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
        folderId: z.string().min(1).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const documentShareCreateSchema = z.object({
    expiresInHours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(168),
    maxDownloads: z.number().int().min(1).max(1000).nullable().optional(),
})

export const shareTokenParamSchema = z.object({
    token: z.string().min(20).max(200),
})

export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'] as const
export const QUOTATION_ITEM_KINDS = ['SERVICE', 'PACKAGE', 'OPTIONAL', 'OTHER'] as const
export const QUOTATION_STATUS_ACTIONS = ['send', 'accept', 'decline', 'expire'] as const

export const quotationItemInputSchema = z.object({
    kind: z.enum(QUOTATION_ITEM_KINDS).default('SERVICE'),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().max(2000).nullable().optional(),
    quantity: z.number().int().min(1).max(9999).default(1),
    unitCents: z.number().int().nonnegative(),
    isOptional: z.boolean().optional(),
    selected: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
})

export const quotationListSchema = z.object({
    q: z.string().trim().max(200).default(''),
    status: z.enum([...QUOTATION_STATUSES, 'all']).default('all'),
    customerUserId: z.string().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const quotationCreateSchema = z.object({
    customerUserId: z.string().min(1),
    title: z.string().trim().min(1).max(240),
    currency: z.string().trim().min(3).max(8).default('PHP'),
    notes: z.string().trim().max(5000).nullable().optional(),
    customerMessage: z.string().trim().max(5000).nullable().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    items: z.array(quotationItemInputSchema).min(1).max(100),
})

export const quotationUpdateSchema = z
    .object({
        title: z.string().trim().min(1).max(240).optional(),
        currency: z.string().trim().min(3).max(8).optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        customerMessage: z.string().trim().max(5000).nullable().optional(),
        validUntil: z.string().datetime().nullable().optional(),
        items: z.array(quotationItemInputSchema).min(1).max(100).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const quotationStatusSchema = z.object({
    action: z.enum(QUOTATION_STATUS_ACTIONS),
})

export const quotationShareCreateSchema = z.object({
    expiresInHours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(168),
    maxViews: z.number().int().min(1).max(1000).nullable().optional(),
})

export const BOOKING_PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'OVERPAID'] as const
export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'CARD', 'OTHER'] as const
export const FINANCE_ENTRY_TYPES = ['INCOME', 'EXPENSE'] as const

export const dateRangeQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
})

export const bookingListSchema = z.object({
    q: z.string().trim().max(200).default(''),
    customerUserId: z.string().min(1).optional(),
    /** `open` = UNPAID + PARTIAL (still owed). */
    paymentStatus: z.enum([...BOOKING_PAYMENT_STATUSES, 'open', 'all']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const bookingUpdateSchema = z
    .object({
        dueAt: z.string().datetime().nullable().optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const paymentListSchema = z.object({
    q: z.string().trim().max(200).default(''),
    customerUserId: z.string().min(1).optional(),
    bookingId: z.string().min(1).optional(),
    method: z.enum([...PAYMENT_METHODS, 'all']).default('all'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    includeVoided: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .optional()
        .transform((value) => value === true || value === 'true'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const paymentCreateSchema = z.object({
    bookingId: z.string().min(1),
    amountCents: z.number().int().positive(),
    method: z.enum(PAYMENT_METHODS),
    paidAt: z.string().datetime().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    reference: z.string().trim().max(240).nullable().optional(),
})

export const paymentUpdateSchema = z
    .object({
        amountCents: z.number().int().positive().optional(),
        method: z.enum(PAYMENT_METHODS).optional(),
        paidAt: z.string().datetime().optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        reference: z.string().trim().max(240).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const paymentVoidSchema = z
    .object({
        reason: z.string().trim().max(1000).nullable().optional(),
    })
    .default({})

export const paymentSummarySchema = dateRangeQuerySchema

export const financeCategoryCreateSchema = z.object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(FINANCE_ENTRY_TYPES),
    sortOrder: z.number().int().min(0).max(9999).optional(),
})

export const financeCategoryUpdateSchema = z
    .object({
        name: z.string().trim().min(1).max(120).optional(),
        sortOrder: z.number().int().min(0).max(9999).optional(),
        archived: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const financeEntryListSchema = z.object({
    q: z.string().trim().max(200).default(''),
    type: z.enum([...FINANCE_ENTRY_TYPES, 'all']).default('all'),
    categoryId: z.string().min(1).optional(),
    currency: z.string().trim().min(3).max(8).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    includeVoided: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .optional()
        .transform((value) => value === true || value === 'true'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const financeEntryCreateSchema = z.object({
    type: z.enum(FINANCE_ENTRY_TYPES),
    categoryId: z.string().min(1),
    amountCents: z.number().int().positive(),
    currency: z.string().trim().min(3).max(8).default('PHP'),
    occurredAt: z.string().datetime().optional(),
    description: z.string().trim().min(1).max(240),
    notes: z.string().trim().max(5000).nullable().optional(),
})

export const financeEntryUpdateSchema = z
    .object({
        categoryId: z.string().min(1).optional(),
        amountCents: z.number().int().positive().optional(),
        currency: z.string().trim().min(3).max(8).optional(),
        occurredAt: z.string().datetime().optional(),
        description: z.string().trim().min(1).max(240).optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const financeEntryVoidSchema = z
    .object({
        reason: z.string().trim().max(1000).nullable().optional(),
    })
    .default({})

export const financeSummarySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    currency: z.string().trim().min(3).max(8).optional(),
})
