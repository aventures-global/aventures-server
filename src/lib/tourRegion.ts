export const TOUR_REGIONS = [
    'philippines',
    'east-asia',
    'southeast-asia',
    'americas',
    'europe',
    'other',
] as const

export type TourRegion = (typeof TOUR_REGIONS)[number]

export function guessRegion(location: string): TourRegion {
    const value = location.toLowerCase()
    if (value.includes('philippines')) return 'philippines'
    if (value.includes('korea') || value.includes('japan')) return 'east-asia'
    if (value.includes('thailand') || value.includes('indonesia')) return 'southeast-asia'
    if (value.includes('united states') || value.includes('california') || value.includes('usa')) {
        return 'americas'
    }
    if (value.includes('europe')) return 'europe'
    return 'other'
}
