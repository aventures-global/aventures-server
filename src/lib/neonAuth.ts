import { createRemoteJWKSet, jwtVerify } from 'jose'

import { prisma } from './prisma.js'

export type NeonIdentity = {
    userId: string
    neonRole: string | null
}

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

function asRole(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null
}

export function isNeonAdminRole(role: string | null | undefined): boolean {
    if (!role) return false
    return role
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .includes('admin')
}

/** Reads the Neon Auth admin-plugin role ("admin", "user", ...) for a user. */
export async function getNeonRole(userId: string): Promise<string | null> {
    try {
        const rows = await prisma.$queryRaw<{ role: string | null }[]>`
            SELECT role FROM neon_auth."user" WHERE id::text = ${userId} LIMIT 1
        `
        return asRole(rows[0]?.role)
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[neonAuth] role lookup failed:', err)
        }
        return null
    }
}

async function verifyJwt(token: string): Promise<NeonIdentity | null> {
    try {
        const issuer = new URL(process.env.NEON_AUTH_URL!).origin
        const { payload } = await jwtVerify(token, getJwks(), { issuer })
        if (typeof payload.sub !== 'string') return null
        // The JWT `role` claim is the Postgres role (e.g. "authenticated"), not the admin-plugin role.
        return { userId: payload.sub, neonRole: null }
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[neonAuth] JWT verify failed:', err)
        }
        return null
    }
}

async function verifySessionToken(token: string): Promise<NeonIdentity | null> {
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
            user?: { id?: string; role?: unknown }
            session?: { userId?: string }
        } | null

        const userId = data?.user?.id ?? data?.session?.userId
        if (!userId) return null
        return { userId, neonRole: asRole(data?.user?.role) }
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[neonAuth] get-session error:', err)
        }
        return null
    }
}

export async function verifyNeonToken(token: string): Promise<NeonIdentity | null> {
    return looksLikeJwt(token) ? verifyJwt(token) : verifySessionToken(token)
}
