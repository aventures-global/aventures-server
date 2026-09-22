export type AuthContext = {
  userId: string
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
