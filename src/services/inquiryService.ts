import { renderInquiryEmail } from '../emails/inquiryEmail.js'
import { getMailAddresses, getMailer } from '../lib/mailer.js'
import { AppError } from '../lib/errors.js'
import type { InquiryInput } from '../schemas/index.js'

const DEFAULT_SITE_URL = 'https://aventures-client.vercel.app'

class InquiryService {
    async send(input: InquiryInput) {
        if (input.honeypot) return

        const { from, to } = getMailAddresses()
        const mailer = getMailer()
        const email = renderInquiryEmail(input, process.env.PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL)
        try {
            await mailer.sendMail({
                from,
                to,
                replyTo: { name: `${input.firstName} ${input.lastName}`, address: input.email },
                ...email,
            })
        } catch (err) {
            console.error('Inquiry email failed', err)
            throw new AppError(502, 'MAIL_SEND_FAILED', 'Could not send your message')
        }
    }
}

export default new InquiryService()
