import { createRemoteJWKSet, jwtVerify } from 'jose'

function neonAuthUrl(path: string): string {
    const base = process.env.NEON_AUTH_URL
    if (!base) {
        throw new Error('NEON_AUTH_URL is not set')
    }
    return new URL(path, base.endsWith('/') ? base : `${base}/`).toString()
}

function looksLikeJwt(token: string): boolean {
    return token.split('.').length === 3
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
    if (!jwks) {
        jwks = createRemoteJWKSet(new URL(neonAuthUrl('.well-known/jwks.json')))
    }
    return jwks
}

export async function verifyNeonToken(token: string): Promise<string | null> {
    if (looksLikeJwt(token)) {
        try {
            const issuer = new URL(process.env.NEON_AUTH_URL!).origin
            const { payload } = await jwtVerify(token, getJwks(), { issuer })
            return typeof payload.sub === 'string' ? payload.sub : null
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('[neonAuth] JWT verify failed:', err)
            }
            return null
        }
    }

    try {
        const res = await fetch(neonAuthUrl('get-session'), {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        })

        if (!res.ok) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('[neonAuth] get-session failed:', res.status)
            }
            return null
        }

        const data = (await res.json()) as {
            user?: { id?: string }
            session?: { userId?: string }
        } | null

        return data?.user?.id ?? data?.session?.userId ?? null
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[neonAuth] get-session error:', err)
        }
        return null
    }
}
