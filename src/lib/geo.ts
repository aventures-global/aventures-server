const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const dLat = toRadians(toLat - fromLat)
    const dLng = toRadians(toLng - fromLng)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}
