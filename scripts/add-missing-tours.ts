import 'dotenv/config'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { tours } from '../../client/src/data/tours.ts'
import { compressImageFile } from '../src/lib/compressImage.js'
import { prisma } from '../src/lib/prisma.js'
import { isR2Configured, putObject } from '../src/lib/storage.js'
import { guessRegion } from '../src/lib/tourRegion.js'
import { buildTourSearchText } from '../src/lib/tourSearchText.js'

/**
 * Creates destinations from client/src/data/tours.ts that are not in the
 * database yet. Existing destinations (and their CMS edits) are left alone.
 * Images are compressed to WebP and uploaded to R2 under the same keys the
 * seed uses.
 */
const clientPublic = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/public')

async function uploadImage(assetPath: string, cache: Map<string, string>) {
    const clean = assetPath.split('?')[0] ?? assetPath
    const cached = cache.get(clean)
    if (cached) return cached

    const compressed = await compressImageFile(path.join(clientPublic, clean.replace(/^\//, '')), false)
    if (compressed.extension !== 'webp') {
        throw new Error(`${clean} did not compress to WebP`)
    }
    const key = `${clean.replace(/^\/+/, '').replace(/\.[^.]+$/, '')}.webp`
    const { url } = await putObject({ key, body: compressed.buffer, contentType: compressed.contentType })
    console.log(`Uploaded ${clean} -> ${url} (${Math.round(compressed.buffer.length / 1024)} KB)`)
    cache.set(clean, url)
    return url
}

async function main() {
    if (!isR2Configured()) {
        throw new Error('R2 is not configured; set the R2_* variables in server/.env')
    }

    const existing = await prisma.tour.findMany({ select: { id: true, slug: true } })
    const taken = new Set(existing.flatMap((tour) => [tour.id, tour.slug]))
    const missing = tours.filter((tour) => !taken.has(tour.id) && !taken.has(tour.slug))
    if (missing.length === 0) {
        console.log('No missing destinations')
        return
    }

    const max = await prisma.tour.aggregate({ _max: { sortOrder: true } })
    let sortOrder = max._max.sortOrder ?? 0
    const cache = new Map<string, string>()

    for (const tour of missing) {
        const coverImage = await uploadImage(tour.coverImage, cache)
        const experiences = []
        for (const experience of tour.experiences) {
            experiences.push({ ...experience, image: await uploadImage(experience.image, cache) })
        }
        sortOrder += 1
        await prisma.tour.create({
            data: {
                id: tour.id,
                slug: tour.slug,
                title: tour.title,
                tagline: tour.tagline,
                shortDescription: tour.shortDescription,
                coverImage,
                location: tour.location,
                experiences,
                storyTitles: tour.storyTitles,
                travelTips: tour.travelTips,
                featured: tour.featured,
                region: guessRegion(tour.location),
                sortOrder,
                searchText: buildTourSearchText({ ...tour, experiences }),
            },
        })
        console.log(`Created ${tour.slug} (${guessRegion(tour.location)})`)
    }

    console.log(`Added ${missing.length} destinations`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
