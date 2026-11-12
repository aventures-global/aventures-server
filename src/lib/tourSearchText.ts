type SearchableTour = {
    title: string
    shortTitle?: string
    tagline: string
    shortDescription: string
    location: string
    slug: string
    storyTitles: string[]
    experiences: { eyebrow?: string; headline?: string }[]
}

export function buildTourSearchText(tour: SearchableTour): string {
    return [
        tour.title,
        tour.shortTitle ?? '',
        tour.tagline,
        tour.shortDescription,
        tour.location,
        tour.slug,
        ...tour.storyTitles,
        ...tour.experiences.flatMap((experience) => [experience.eyebrow ?? '', experience.headline ?? '']),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
}
