import nodemailer, { type Transporter } from 'nodemailer'

import { AppError } from './errors.js'

let transporter: Transporter | null = null

function requireEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) {
        throw new AppError(503, 'MAIL_NOT_CONFIGURED', 'Email delivery is not configured')
    }
    return value
}

export function getMailer(): Transporter {
    if (transporter) return transporter

    // Cloudflare Email Service only accepts implicit TLS on 465; STARTTLS on 587 is rejected.
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || 'smtp.mx.cloudflare.net',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: 'api_token',
            pass: requireEnv('CF_API_TOKEN'),
        },
    })
    return transporter
}

export function getMailAddresses() {
    return {
        from: requireEnv('MAIL_FROM'),
        to: requireEnv('MAIL_TO'),
    }
}
