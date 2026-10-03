import cors from 'cors'
import express from 'express'

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import apiRouter from './routes/index.js'
import { success } from 'zod'
import { AppError } from './lib/errors.js'

const app = express()

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
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api', apiRouter)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
