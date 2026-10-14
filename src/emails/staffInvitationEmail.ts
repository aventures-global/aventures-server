import { colors, escapeHtml, sans, serif } from './inquiryEmail.js'

const ROLE_NAMES = { STAFF: 'staff member', ADMIN: 'admin' } as const

export function renderStaffInvitationEmail(input: {
    role: keyof typeof ROLE_NAMES
    inviterName: string
    acceptUrl: string
    expiresAt: Date
    siteUrl: string
}) {
    const roleName = ROLE_NAMES[input.role]
    const subject = `You're invited to join the AVENtures admin team as ${roleName === 'admin' ? 'an' : 'a'} ${roleName}`
    const expires = input.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const siteUrl = input.siteUrl.replace(/\/$/, '')
    const url = escapeHtml(input.acceptUrl)

    const text = [
        `${input.inviterName} invited you to the AVENtures admin site as ${roleName === 'admin' ? 'an' : 'a'} ${roleName}.`,
        `Accept the invitation: ${input.acceptUrl}`,
        `The link expires on ${expires}. If you were not expecting this, you can ignore this email.`,
    ].join('\n\n')

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.oat};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.oat}" style="background-color:${colors.oat};">
<tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${colors.cream};border:1px solid rgba(22,55,101,0.15);">
        <tr><td align="center" bgcolor="${colors.royalDeep}" style="background-color:${colors.royalDeep};padding:34px 32px 30px;">
            <img src="${siteUrl}/logo.png" width="64" height="58" alt="" style="display:block;margin:0 auto 12px;border:0;">
            <p style="margin:0;font-family:${serif};font-size:30px;line-height:34px;letter-spacing:4px;color:${colors.gold};">AVENtures</p>
        </td></tr>
        <tr><td style="padding:40px 40px 0;font-family:${serif};font-size:28px;line-height:36px;color:${colors.ink};">You're invited to the admin team</td></tr>
        <tr><td style="padding:14px 40px 0;font-family:${sans};font-size:15px;line-height:24px;color:rgba(11,11,11,0.7);">${escapeHtml(input.inviterName)} invited you to the AVENtures admin site as ${roleName === 'admin' ? 'an' : 'a'} <strong>${roleName}</strong>. Your access starts once you accept.</td></tr>
        <tr><td align="center" style="padding:32px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="${colors.royal}" style="background-color:${colors.royal};border:2px solid ${colors.gold};">
                    <a href="${url}" style="display:inline-block;padding:14px 34px;font-family:${sans};font-size:14px;font-weight:500;letter-spacing:1px;color:${colors.cream};text-decoration:none;">Review invitation</a>
                </td>
            </tr></table>
        </td></tr>
        <tr><td style="padding:0 40px 40px;font-family:${sans};font-size:12px;line-height:19px;color:rgba(11,11,11,0.55);">This link expires on ${escapeHtml(expires)}. If you were not expecting this invitation, you can ignore this email.<br>${url}</td></tr>
    </table>
</td></tr>
</table>
</body>
</html>`

    return { subject, text, html }
}
