import { AppError } from './errors.js'

const SEND_TIMEOUT_MS = 10_000

type Address = string | { address: string; name: string }

type CloudflareSendResponse = {
    success?: boolean
    errors?: { code: number; message: string }[]
    result?: {
        permanent_bounces?: string[]
        suppressed_recipients?: string[]
    } | null
}

export type OutgoingEmail = {
    replyTo: { address: string; name: string }
    subject: string
    html: string
    text: string
}

function requireEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) {
        throw new AppError(503, 'MAIL_NOT_CONFIGURED', 'Email delivery is not configured')
    }
    return value
}

/** Accepts `Name <user@domain>` or a bare address. */
function parseAddress(value: string): Address {
    const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
    if (!match) return value
    const [, name, address] = match
    return name ? { name, address: address.trim() } : address.trim()
}

export async function sendEmail(email: OutgoingEmail) {
    const token = requireEnv('CF_API_TOKEN')
    const accountId = requireEnv('CF_ACCOUNT_ID')
    const from = parseAddress(requireEnv('MAIL_FROM'))
    const to = requireEnv('MAIL_TO')

    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to,
                reply_to: email.replyTo,
                subject: email.subject,
                html: email.html,
                text: email.text,
            }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        },
    )

    const body = (await res.json().catch(() => null)) as CloudflareSendResponse | null
    if (!res.ok || !body?.success) {
        const errors = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ') || 'no error details'
        throw new Error(`Cloudflare send failed (${res.status}): ${errors}`)
    }

    const rejected = [
        ...(body.result?.permanent_bounces ?? []),
        ...(body.result?.suppressed_recipients ?? []),
    ]
    if (rejected.includes(to)) {
        throw new Error(`Cloudflare did not deliver to ${to} (bounced or suppressed)`)
    }
}
