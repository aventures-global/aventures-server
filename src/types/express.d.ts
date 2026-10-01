export type AuthContext = {
    userId: string
    /** Admin-plugin role when the token carries it (session tokens only); null for JWTs. */
    neonRole: string | null
}

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN'

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext
            user?: {
                id: string
                email: string | null
                role: UserRole
            }
        }
    }
}

export {}
