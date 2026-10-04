export const STORY_COUNT = 3
export const TRAVEL_TIP_COUNT = 4

/** Eyebrows of the fixed sections used before they became editable; fills rows saved without one. */
export const LEGACY_EXPERIENCE_EYEBROWS = ['See', 'Taste', 'Experience', 'Discover', 'Explore'] as const

export type TourExperience = {
    eyebrow: string
    headline: string
    summary: string
    body: string
    image: string
}
