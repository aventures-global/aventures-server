import cors from 'cors'
import express from 'express'

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import apiRouter from './routes/index.js'
import { stripeWebhookRouter } from './routes/stripe.routes.js'

const app = express()

// Behind a reverse proxy, rate limiting needs the client IP from X-Forwarded-For.
if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY)
    app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops)
}

const origins = [
    process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    process.env.ADMIN_ORIGIN,
    process.env.DEV_ORIGIN
].filter((value): value is string => Boolean(value))

app.use(
    cors({
        origin: origins.length === 1 ? origins[0] : origins,
    }),
)

// Stripe needs the raw body for signature verification — mount before JSON parsing.
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter)

app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api', apiRouter)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
