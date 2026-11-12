import 'dotenv/config'

import { tours } from '../../client/src/data/tours.ts'
import { prisma } from '../src/lib/prisma.js'
import { buildTourSearchText } from '../src/lib/tourSearchText.js'

async function main() {
    let updated = 0
    for (const tour of tours) {
        const shortTitle = tour.shortTitle ?? ''
        const existing = await prisma.tour.findUnique({ where: { id: tour.id } })
        if (!existing) {
            console.log(`skip missing ${tour.id}`)
            continue
        }
        const experiences = Array.isArray(existing.experiences)
            ? (existing.experiences as { eyebrow?: string; headline?: string }[])
            : []
        await prisma.tour.update({
            where: { id: tour.id },
            data: {
                shortTitle,
                searchText: buildTourSearchText({
                    title: existing.title,
                    shortTitle,
                    tagline: existing.tagline,
                    shortDescription: existing.shortDescription,
                    location: existing.location,
                    slug: existing.slug,
                    storyTitles: existing.storyTitles,
                    experiences,
                }),
            },
        })
        updated += 1
        console.log(`${tour.id} -> ${shortTitle}`)
    }
    console.log(`Updated ${updated} destinations`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
