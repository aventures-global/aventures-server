type SearchableTour = {
    title: string
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
