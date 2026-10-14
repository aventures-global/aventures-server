export type BusinessSettings = {
    email: string
    phoneDisplay: string
    addressLines: string[]
    facebookUrl: string
    instagramUrl: string
    tiktokUrl: string
    facebookHandle: string
    instagramHandle: string
    tiktokHandle: string
}

/** Matches the values that were hard-coded in `client/src/data/site.ts` before they became editable. */
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
    email: 'admin@aventurestravel.com',
    phoneDisplay: '+1 (916) 268-7731',
    addressLines: ['3419 Arden Way', 'Sacramento, CA', 'United States'],
    facebookUrl: 'https://www.facebook.com/AventuresGlobal',
    instagramUrl: 'https://www.instagram.com/aventuresglobal',
    tiktokUrl: 'https://www.tiktok.com/@aventuresglobal',
    facebookHandle: '@aventuresglobal',
    instagramHandle: '@aventuresglobal',
    tiktokHandle: '@aventuresglobal',
}
