import { prisma } from './prisma.js'

export type GeocodeResult = {
    lat: number
    lng: number
    label: string
    /** English country name, e.g. "United States". */
    country: string | null
    /** Nominatim address type, e.g. "country", "city", "state". */
    placeType: string | null
}

type NominatimPlace = {
    lat: string
    lon: string
    name?: string
    display_name?: string
    addresstype?: string
    namedetails?: Record<string, string> | null
    address?: { country?: string } | null
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const DEFAULT_USER_AGENT = 'AVENtures/1.0 (admin@aventurestravel.com)'
/** Nominatim's usage policy allows at most one request per second. */
const MIN_INTERVAL_MS = 1100
const TIMEOUT_MS = 4000

let queue: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

function cacheKey(query: string) {
    return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

function throttled<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
        const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
        lastRequestAt = Date.now()
        return task()
    })
    queue = run.catch(() => undefined)
    return run
}

async function fetchNominatim(query: string): Promise<GeocodeResult | null> {
    const url = new URL(NOMINATIM_URL)
    url.search = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        namedetails: '1',
        addressdetails: '1',
        'accept-language': 'en',
    }).toString()

    const response = await fetch(url, {
        headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT?.trim() || DEFAULT_USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Nominatim responded ${response.status}`)

    const [place] = (await response.json()) as NominatimPlace[]
    if (!place) return null
    const lat = Number(place.lat)
    const lng = Number(place.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
        lat,
        lng,
        label: place.namedetails?.['name:en'] || place.name || place.display_name?.split(',')[0] || query,
        country: place.address?.country ?? null,
        placeType: place.addresstype ?? null,
    }
}

/**
 * Looks up a place name via OpenStreetMap Nominatim, caching hits and misses in
 * GeocodeCache. Network or service errors return null and are not cached.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
    const key = cacheKey(query)
    if (!key) return null

    const cached = await prisma.geocodeCache.findUnique({ where: { query: key } })
    if (cached) {
        return cached.lat !== null && cached.lng !== null
            ? {
                  lat: cached.lat,
                  lng: cached.lng,
                  label: cached.label ?? query,
                  country: cached.country,
                  placeType: cached.placeType,
              }
            : null
    }

    let result: GeocodeResult | null
    try {
        result = await throttled(() => fetchNominatim(key))
    } catch (err) {
        console.warn('Geocoding failed:', err instanceof Error ? err.message : err)
        return null
    }

    await prisma.geocodeCache.upsert({
        where: { query: key },
        create: {
            query: key,
            lat: result?.lat ?? null,
            lng: result?.lng ?? null,
            label: result?.label ?? null,
            country: result?.country ?? null,
            placeType: result?.placeType ?? null,
        },
        update: {},
    })
    return result
}
