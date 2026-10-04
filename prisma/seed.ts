import 'dotenv/config'

import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { merch } from '../../client/src/data/merch.ts'
import { partners } from '../../client/src/data/partners.ts'
import { testimonials } from '../../client/src/data/testimonials.ts'
import { tours } from '../../client/src/data/tours.ts'

import { compressImageFile } from '../src/lib/compressImage.js'
import { seedFaqs } from './faqSeed.ts'
import { parsePriceToCents } from '../src/lib/money.js'
import { prisma } from '../src/lib/prisma.js'
import { guessRegion } from '../src/lib/tourRegion.js'
import { isR2Configured, putObject, publicUrlForKey } from '../src/lib/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientPublic = path.resolve(__dirname, '../../client/public')

function stripQuery(assetPath: string) {
    return assetPath.split('?')[0] ?? assetPath
}

function toKey(assetPath: string, extension: string) {
    const clean = stripQuery(assetPath).replace(/^\/+/, '')
    const withoutExt = clean.replace(/\.[^.]+$/, '')
    return `${withoutExt}.${extension}`
}

async function exists(filePath: string) {
    try {
        await access(filePath)
        return true
    } catch {
        return false
    }
}

async function resolveAssetUrl(assetPath: string, urlMap: Map<string, string>) {
    const clean = stripQuery(assetPath)
    if (urlMap.has(clean)) return urlMap.get(clean)!
    if (urlMap.has(assetPath)) return urlMap.get(assetPath)!

    if (isR2Configured()) {
        const ext = path.extname(clean).toLowerCase()
        const isSvg = ext === '.svg'
        const key = toKey(clean, isSvg ? 'svg' : 'webp')
        return publicUrlForKey(key)
    }

    return assetPath
}

async function uploadAsset(assetPath: string, urlMap: Map<string, string>) {
    const clean = stripQuery(assetPath)
    if (urlMap.has(clean)) return

    const localPath = path.join(clientPublic, clean.replace(/^\//, ''))
    if (!(await exists(localPath))) {
        console.warn(`Missing asset file: ${localPath}`)
        if (isR2Configured()) {
            const ext = path.extname(clean).toLowerCase()
            const isSvg = ext === '.svg'
            urlMap.set(clean, publicUrlForKey(toKey(clean, isSvg ? 'svg' : 'webp')))
        } else {
            urlMap.set(clean, assetPath)
        }
        return
    }

    if (!isR2Configured()) {
        urlMap.set(clean, assetPath)
        return
    }

    const ext = path.extname(clean).toLowerCase()
    const isSvg = ext === '.svg'
    const compressed = await compressImageFile(localPath, isSvg)
    const key = toKey(clean, compressed.extension)
    const uploaded = await putObject({
        key,
        body: compressed.buffer,
        contentType: compressed.contentType,
    })
    urlMap.set(clean, uploaded.url)
    console.log(`Uploaded ${clean} → ${uploaded.url}`)
}

async function collectPaths() {
    const paths = new Set<string>()
    for (const tour of tours) {
        paths.add(tour.coverImage)
        for (const experience of tour.experiences) paths.add(experience.image)
    }
    for (const product of merch) {
        paths.add(product.coverImage)
        for (const image of product.gallery) paths.add(image)
    }
    for (const partner of partners) {
        paths.add(partner.logoSrc)
    }
    return [...paths]
}

async function main() {
    const urlMap = new Map<string, string>()
    const assets = await collectPaths()

    if (!isR2Configured()) {
        console.warn(
            'R2 env vars missing — seeding with original /assets paths. Set R2_* to upload WebP.',
        )
    }

    for (const asset of assets) {
        await uploadAsset(asset, urlMap)
    }

    for (const [index, partner] of partners.entries()) {
        await prisma.partner.upsert({
            where: { id: partner.id },
            create: {
                id: partner.id,
                name: partner.name,
                logoSrc: await resolveAssetUrl(partner.logoSrc, urlMap),
                sortOrder: index,
            },
            update: {
                name: partner.name,
                logoSrc: await resolveAssetUrl(partner.logoSrc, urlMap),
                sortOrder: index,
            },
        })
    }

    for (const [index, item] of testimonials.entries()) {
        await prisma.testimonial.upsert({
            where: { id: item.id },
            create: {
                id: item.id,
                quote: item.quote,
                name: item.name,
                trip: item.trip,
                rating: item.rating,
                sortOrder: index,
            },
            update: {
                quote: item.quote,
                name: item.name,
                trip: item.trip,
                rating: item.rating,
                sortOrder: index,
            },
        })
    }

    for (const [index, tour] of tours.entries()) {
        const experiences = await Promise.all(
            tour.experiences.map(async (experience) => ({
                ...experience,
                image: await resolveAssetUrl(experience.image, urlMap),
            })),
        )
        const content = {
            slug: tour.slug,
            title: tour.title,
            tagline: tour.tagline,
            shortDescription: tour.shortDescription,
            coverImage: await resolveAssetUrl(tour.coverImage, urlMap),
            location: tour.location,
            experiences,
            storyTitles: tour.storyTitles,
            travelTips: tour.travelTips,
            featured: tour.featured,
        }
        await prisma.tour.upsert({
            where: { id: tour.id },
            create: {
                id: tour.id,
                ...content,
                region: guessRegion(tour.location),
                sortOrder: index + 1,
            },
            update: content,
        })
    }

    for (const product of merch) {
        const gallery = await Promise.all(
            product.gallery.map((image) => resolveAssetUrl(image, urlMap)),
        )
        await prisma.merchProduct.upsert({
            where: { id: product.id },
            create: {
                id: product.id,
                slug: product.slug,
                name: product.name,
                tagline: product.tagline,
                description: product.description,
                priceCents: parsePriceToCents(product.price),
                currency: 'USD',
                category: product.category,
                coverImage: await resolveAssetUrl(product.coverImage, urlMap),
                gallery,
                sizes: product.sizes ?? [],
                inStock: product.inStock,
            },
            update: {
                slug: product.slug,
                name: product.name,
                tagline: product.tagline,
                description: product.description,
                priceCents: parsePriceToCents(product.price),
                currency: 'USD',
                category: product.category,
                coverImage: await resolveAssetUrl(product.coverImage, urlMap),
                gallery,
                sizes: product.sizes ?? [],
                inStock: product.inStock,
            },
        })
    }

    await seedFaqs(prisma)

    console.log(
        `Seeded ${tours.length} tours, ${merch.length} merch, ${partners.length} partners, ${testimonials.length} testimonials`,
    )
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
