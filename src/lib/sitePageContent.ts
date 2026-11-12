export const SITE_PAGE_IDS = ['home', 'about', 'privacy', 'terms'] as const

export type SitePageId = (typeof SITE_PAGE_IDS)[number]

export type TitledItem = { title: string; description: string }

export type HomePageContent = {
    hero: { title: string; subtitle: string; ctaLabel: string }
    story: { eyebrow: string; title: string; body: string; linkLabel: string }
    whyUs: { eyebrow: string; title: string; points: string[] }
}

export type AboutPageContent = {
    intro: string
    whyUs: { eyebrow: string; title: string; intro: string; pillars: TitledItem[]; promise: string[]; quote: string }
    founder: {
        eyebrow: string
        title: string
        intro: string
        name: string
        role: string
        story: string
        whyItMatters: string
        quote: string
    }
    partner: {
        caption: string
        name: string
        role: string
        bio: string
    }
    origin: {
        eyebrow: string
        title: string
        intro: string
        story: string
        values: TitledItem[]
        mission: string
        vision: string
    }
    transparency: {
        eyebrow: string
        title: string
        intro: string
        principle: string
        contact: { address: string; email: string; phone: string }
        visas: string[]
        support: string[]
        disclaimer: string
        footnote: string
    }
}

export type LegalSectionContent = { id: string; label: string; title: string; body: string }

export type LegalPageContent = {
    subtitle: string
    intro: string
    lastUpdated: string
    sections: LegalSectionContent[]
}

export type SitePageContentMap = {
    home: HomePageContent
    about: AboutPageContent
    privacy: LegalPageContent
    terms: LegalPageContent
}

/** Fills a missing partner on older About page rows until the next CMS save. */
export const DEFAULT_ABOUT_PARTNER: AboutPageContent['partner'] = {
    caption: 'Co-owner',
    name: 'Rykiel Avendula',
    role: 'Business Development, Marketing, Sales & Digital Operations Lead',
    bio: `Rykiel Avendula is co-owner of AVENtures Global Resources and Travel Agency. He leads business development, marketing, sales and digital operations, and makes sure every client gets a smooth, well-planned experience from the first inquiry to the trip home.

He brings over 10 years of experience from Rek Global Opportunities and Visa Consultancy Inc., his family’s business. There he worked with clients on international opportunities and saw how much careful guidance means to people planning a move or a journey abroad. That experience shapes how AVENtures works today: personal, responsive and focused on the details.

Rykiel is also a seasoned entrepreneur. In Cebu, he owned and operated a well-known internet café with 200 computer stations, which gave him strong experience in technology, daily operations and serving a high volume of customers. With his wife, he also owned and ran Kikay’s Lechon House, where he learned the value of true hospitality. He also worked as a Sales Representative selling cars at Lapu-Lapu Autosales and Trading in the Philippines, which sharpened his skills in client relationships and negotiation.

He first studied Business Administration (BSBA), majoring in Real Estate Management, before following his passion for food and hospitality and earning a Diploma in Culinary Arts.

Above all, Rykiel is driven by his dedication to his wife and business partner, Mary Kathleen Avendula. Together they built AVENtures on a shared vision, and he is passionate about supporting her and growing the agency into a trusted name for travelers and families. He combines his background in business, technology, sales, hospitality and global services to help every client travel with confidence, whether they’re booking a family vacation, a group tour or support for a journey abroad.`,
}
