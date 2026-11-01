import { colors, escapeHtml, sans, serif } from './inquiryEmail.js'

export function renderQuotationEmail(input: {
    customerName: string
    number: string
    title: string
    shareUrl: string
    customerMessage: string | null
    validUntil: Date | null
    businessName: string
    totalFormatted: string
    siteUrl: string
}) {
    const subject = `Your quotation ${input.number} — ${input.title}`
    const siteUrl = input.siteUrl.replace(/\/$/, '')
    const shareUrl = escapeHtml(input.shareUrl)
    const validUntil = input.validUntil
        ? input.validUntil.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          })
        : null

    const textParts = [
        `Hello ${input.customerName},`,
        `${input.businessName} has prepared quotation ${input.number}: ${input.title}.`,
        `Total: ${input.totalFormatted}`,
    ]
    if (input.customerMessage?.trim()) {
        textParts.push(input.customerMessage.trim())
    }
    if (validUntil) {
        textParts.push(`Valid until ${validUntil}.`)
    }
    textParts.push(
        `View your quotation online: ${input.shareUrl}`,
        'A PDF copy is attached to this email.',
        `If you have questions, reply to this email or contact ${input.businessName}.`,
    )
    const text = textParts.join('\n\n')

    const messageBlock = input.customerMessage?.trim()
        ? `<tr><td style="padding:18px 40px 0;font-family:${sans};font-size:15px;line-height:24px;color:rgba(11,11,11,0.75);">${escapeHtml(input.customerMessage.trim())}</td></tr>`
        : ''
    const validityBlock = validUntil
        ? `<tr><td style="padding:10px 40px 0;font-family:${sans};font-size:13px;line-height:20px;color:rgba(11,11,11,0.55);">Valid until ${escapeHtml(validUntil)}</td></tr>`
        : ''

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
        <tr><td style="padding:40px 40px 0;font-family:${serif};font-size:28px;line-height:36px;color:${colors.ink};">Your quotation is ready</td></tr>
        <tr><td style="padding:14px 40px 0;font-family:${sans};font-size:15px;line-height:24px;color:rgba(11,11,11,0.7);">Hello ${escapeHtml(input.customerName)},<br><br>${escapeHtml(input.businessName)} prepared <strong>${escapeHtml(input.number)}</strong> — ${escapeHtml(input.title)}. Total: <strong>${escapeHtml(input.totalFormatted)}</strong>.</td></tr>
        ${messageBlock}
        ${validityBlock}
        <tr><td align="center" style="padding:32px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="${colors.royal}" style="background-color:${colors.royal};border:2px solid ${colors.gold};">
                    <a href="${shareUrl}" style="display:inline-block;padding:14px 34px;font-family:${sans};font-size:14px;font-weight:500;letter-spacing:1px;color:${colors.cream};text-decoration:none;">View quotation</a>
                </td>
            </tr></table>
        </td></tr>
        <tr><td style="padding:0 40px 40px;font-family:${sans};font-size:12px;line-height:19px;color:rgba(11,11,11,0.55);">A PDF copy is attached to this email.<br>${shareUrl}</td></tr>
    </table>
</td></tr>
</table>
</body>
</html>`

    return { subject, text, html }
}
