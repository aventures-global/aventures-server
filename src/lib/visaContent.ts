export const VISA_IDS = ['tourist', 'fiance', 'k2', 'j1', 'r1', 'r2', 'p1', 'p2', 'e2'] as const
export const VISA_PAGE_SLUGS = ['tourist', 'k1-k2', 'j1', 'r1-r2', 'p1-p2', 'e2'] as const
export const FINDER_PATH_IDS = ['visiting', 'fiance', 'exchange', 'religious', 'performance', 'investing'] as const
export const READINESS_IDS = ['yes', 'arranging', 'no', 'unsure'] as const
export const EXPLORE_LINK_IDS = ['tours', 'ask'] as const

export const VISA_CATALOG_ID = 'catalog'

export type VisaId = (typeof VISA_IDS)[number]
export type VisaPageSlug = (typeof VISA_PAGE_SLUGS)[number]
export type FinderPathId = (typeof FINDER_PATH_IDS)[number]
export type ReadinessId = (typeof READINESS_IDS)[number]

export type VisaChecklistContent = {
    tagline: string
    intro: string
    groups: { title: string; items: string[] }[]
    reminder: string
}

export type VisaServiceContent = {
    id: VisaId
    title: string
    shortLabel: string
    description: string
    anchor: string
    category: string
    askVisaType: string
    faqCategoryId: string | null
    faqCategory: string
    introFaqId: string | null
    introQuestion: string
    qualifyFaqId: string | null
    qualifyQuestion: string
    checklist: VisaChecklistContent
    checklistPdf: { href: string; downloadName: string }
}

export type VisaPageContent = {
    slug: VisaPageSlug
    title: string
    description: string
    visas: VisaId[]
}

export type VisaFinderContent = {
    eyebrow: string
    heading: string
    disclaimer: string
    purpose: { title: string; options: { id: string; label: string; path: FinderPathId | null }[] }
    roles: Record<FinderPathId, { title: string; options: { id: string; label: string; visa: VisaId | null }[] }>
    readiness: Record<VisaId, { title: string; options: { id: ReadinessId; label: string }[] }>
    notes: Record<ReadinessId, string>
    touristNotes: Record<ReadinessId, string>
    exploreLinks: { id: (typeof EXPLORE_LINK_IDS)[number]; label: string; note: string; href: string }[]
}

export type VisaCatalogContent = {
    pages: VisaPageContent[]
    services: VisaServiceContent[]
    finder: VisaFinderContent
}
