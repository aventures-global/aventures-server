import { Router } from 'express'

import cartRoutes from './cart.routes.js'
import inquiriesRoutes from './inquiries.routes.js'
import meRoutes from './me.routes.js'
import merchRoutes from './merch.routes.js'
import partnersRoutes from './partners.routes.js'
import testimonialsRoutes from './testimonials.routes.js'
import toursRoutes from './tours.routes.js'
import uploadsRoutes from './uploads.routes.js'

const apiRouter = Router()

apiRouter.use('/tours', toursRoutes)
apiRouter.use('/merch', merchRoutes)
apiRouter.use('/partners', partnersRoutes)
apiRouter.use('/testimonials', testimonialsRoutes)
apiRouter.use('/me', meRoutes)
apiRouter.use('/cart', cartRoutes)
apiRouter.use('/uploads', uploadsRoutes)
apiRouter.use('/inquiries', inquiriesRoutes)

export default apiRouter
