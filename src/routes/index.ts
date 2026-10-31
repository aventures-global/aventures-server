import { Router } from 'express'

import adminUsersRoutes from './adminUsers.routes.js'
import cartRoutes from './cart.routes.js'
import { adminDocumentsRouter, publicDocumentSharesRouter } from './documents.routes.js'
import faqsRoutes from './faqs.routes.js'
import inquiriesRoutes from './inquiries.routes.js'
import { adminInvitationsRouter, publicInvitationsRouter } from './invitations.routes.js'
import meRoutes from './me.routes.js'
import merchRoutes from './merch.routes.js'
import partnersRoutes from './partners.routes.js'
import { adminQuotationsRouter, publicQuotationSharesRouter } from './quotations.routes.js'
import settingsRoutes from './settings.routes.js'
import sitePagesRoutes from './sitePages.routes.js'
import testimonialsRoutes from './testimonials.routes.js'
import toursRoutes from './tours.routes.js'
import uploadsRoutes from './uploads.routes.js'
import visaRoutes from './visa.routes.js'

const apiRouter = Router()

apiRouter.use('/tours', toursRoutes)
apiRouter.use('/merch', merchRoutes)
apiRouter.use('/partners', partnersRoutes)
apiRouter.use('/testimonials', testimonialsRoutes)
apiRouter.use('/faqs', faqsRoutes)
apiRouter.use('/visa', visaRoutes)
apiRouter.use('/pages', sitePagesRoutes)
apiRouter.use('/me', meRoutes)
apiRouter.use('/cart', cartRoutes)
apiRouter.use('/uploads', uploadsRoutes)
apiRouter.use('/inquiries', inquiriesRoutes)
apiRouter.use('/admin/users', adminUsersRoutes)
apiRouter.use('/admin/invitations', adminInvitationsRouter)
apiRouter.use('/admin/documents', adminDocumentsRouter)
apiRouter.use('/admin/quotations', adminQuotationsRouter)
apiRouter.use('/document-shares', publicDocumentSharesRouter)
apiRouter.use('/quotation-shares', publicQuotationSharesRouter)
apiRouter.use('/invitations', publicInvitationsRouter)
apiRouter.use('/settings', settingsRoutes)

export default apiRouter
