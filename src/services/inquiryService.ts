import { renderInquiryEmail } from '../emails/inquiryEmail.js'
import { sendEmail } from '../lib/mailer.js'
import { AppError, isAppError } from '../lib/errors.js'
import type { InquiryInput } from '../schemas/index.js'

const DEFAULT_SITE_URL = 'https://aventures-client.vercel.app'

class InquiryService {
    async send(input: InquiryInput) {
        if (input.honeypot) {
            console.warn(`Inquiry dropped by honeypot (kind: ${input.kind})`)
            return
        }

        const email = renderInquiryEmail(input, process.env.PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL)
        try {
            await sendEmail({
                replyTo: { name: [input.firstName, input.lastName].filter(Boolean).join(' '), address: input.email },
                ...email,
            })
        } catch (err) {
            if (isAppError(err)) throw err
            console.error('Inquiry email failed', err instanceof Error ? err.message : err)
            throw new AppError(502, 'MAIL_SEND_FAILED', 'Could not send your message')
        }
    }
}

export default new InquiryService()
