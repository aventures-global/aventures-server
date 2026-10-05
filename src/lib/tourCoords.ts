import { geocode } from './geocoder.js'

type Coords = { lat: number; lng: number }

/** Multi-city or vague locations that a geocoder would place badly. Keys are lowercase. */
const LOCATION_OVERRIDES: Record<string, Coords> = {
    'seoul & surrounds, south korea': { lat: 37.5665, lng: 126.978 },
    'tokyo & kyoto, japan': { lat: 35.6762, lng: 139.6503 },
    'bangkok & islands, thailand': { lat: 13.7563, lng: 100.5018 },
    'bali & islands, indonesia': { lat: -8.3405, lng: 115.092 },
    'western europe': { lat: 48.5, lng: 5 },
    'beijing & shanghai, china': { lat: 34, lng: 119 },
    'sapporo & furano, hokkaido, japan': { lat: 43.0618, lng: 141.3545 },
    'phuket & phi phi islands, thailand': { lat: 7.8804, lng: 98.3923 },
    'labuan bajo & komodo, indonesia': { lat: -8.4964, lng: 119.8877 },
}

/**
 * Coordinates for a tour location: an override if one exists, otherwise a geocode of
 * the full location, then of its broader comma-separated parts (e.g. just the country).
 */
export async function resolveTourCoords(location: string): Promise<Coords | null> {
    const key = location.trim().toLowerCase()
    if (!key) return null
    if (LOCATION_OVERRIDES[key]) return LOCATION_OVERRIDES[key]

    const parts = location.split(',').map((part) => part.trim()).filter(Boolean)
    for (let start = 0; start < parts.length; start++) {
        const result = await geocode(parts.slice(start).join(', '))
        if (result) return { lat: result.lat, lng: result.lng }
    }
    return null
}
