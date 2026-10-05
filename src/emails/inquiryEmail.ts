import type { InquiryInput } from '../schemas/index.js'

const colors = {
    oat: '#f5f0e7',
    cream: '#faf7f0',
    ink: '#0b0b0b',
    royal: '#163765',
    royalDeep: '#0d3473',
    royalNight: '#071b3c',
    gold: '#e1b21d',
    goldDeep: '#ffb000',
    goldDark: '#a98000',
}

// Custom webfonts are ignored by Gmail/Outlook, so every stack ends in a safe fallback.
const serif = "'Noto Serif Display','Noto Serif',Georgia,'Times New Roman',serif"
const sans = "Poppins,'Segoe UI',Helvetica,Arial,sans-serif"

const kindLabels: Record<InquiryInput['kind'], string> = {
    question: 'Ask AVENtures question',
    contact: 'Travel inquiry',
    consultation: 'Consultation request',
    onboarding: 'Start Your AVENture inquiry',
    flights: 'Flight request',
    hotels: 'Hotel request',
    cars: 'Transfer request',
}

type Field = [label: string, value: string | undefined]
type Section = [title: string, fields: Field[]]
type OnboardingInput = Extract<InquiryInput, { kind: 'onboarding' }>

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function fullName(input: InquiryInput) {
    return [input.firstName, input.lastName].filter(Boolean).join(' ')
}

function place(input: InquiryInput) {
    if (input.kind === 'question') return input.visaType
    if (input.kind === 'contact') return input.interest
    if (input.kind === 'consultation') return input.service
    return input.kind === 'cars' ? input.pickup : input.destination
}

function message(input: InquiryInput) {
    if (input.kind === 'question') return input.question
    if (input.kind === 'onboarding') return undefined
    if (input.kind === 'contact' || input.kind === 'consultation') return input.message
    return input.notes
}

function travelersSummary(input: OnboardingInput) {
    const adults = Number(input.adults)
    const children = Number(input.children)
    const counts = [
        adults > 0 ? `${adults} adult${adults === 1 ? '' : 's'}` : '',
        children > 0 ? `${children} child${children === 1 ? '' : 'ren'}` : '',
    ].filter(Boolean)
    return [input.group, counts.join(', ')].filter(Boolean).join(' · ')
}

function datesSummary(input: OnboardingInput) {
    if (input.departure && input.returnDate) return `${input.departure} – ${input.returnDate}`
    if (input.departure) return `From ${input.departure}`
    return input.duration ?? ''
}

function onboardingHighlights(input: OnboardingInput): [string, string][] {
    return present([
        ['When', datesSummary(input) || 'Flexible'],
        ['Who', travelersSummary(input)],
        ['Budget', [input.budget, input.budgetType?.toLowerCase()].filter(Boolean).join(', ')],
    ])
}

function onboardingSections(input: OnboardingInput): Section[] {
    return [
        ['The trip', [
            ['Service', input.service],
            ['Destination', input.destination],
            ['Departure', input.departure],
            ['Return', input.returnDate],
            ['Trip length', input.duration],
            ['Flexible dates', input.flexibleDates],
        ]],
        ['Travelers', [
            ['Traveling as', input.group],
            ['Adults', input.adults],
            ['Children', input.children],
            ['Group size', input.groupSize],
        ]],
        ['Budget', [
            ['Range', input.budget],
            ['Basis', input.budgetType],
        ]],
        ['Accommodation', [
            ['Stay style', input.accommodation],
            ['Priorities', input.accommodationNeeds],
        ]],
        ['Itinerary', [
            ['Interests', input.interests],
            ['Places in mind', input.hasPlans],
            ['Places to visit', input.plannedPlaces],
        ]],
        ['Flights', [
            ['Priority', input.flightPriority],
            ['Cabin', input.cabin],
            ['Baggage', input.baggage],
        ]],
        ['Transportation', [['Needs', input.transportation]]],
        ['Visa assistance', [
            ['Visa service', input.visaType],
            ['Travel purpose', input.visaPurpose],
            ['Current stage', input.visaStatus],
            ['Passport status', input.passportStatus],
            ['Passport expiry', input.passportExpiry],
            ['Previous application', input.previousVisa],
            ['Existing appointment', input.appointment],
            ['Help needed', input.visaHelp],
        ]],
    ]
}

function detailSections(input: InquiryInput): Section[] {
    if (input.kind === 'onboarding') return onboardingSections(input)
    return [[input.kind === 'question' ? 'Question details' : 'Trip details', detailFields(input)]]
}

function detailFields(input: Exclude<InquiryInput, OnboardingInput>): Field[] {
    switch (input.kind) {
        case 'question':
            return [['Visa type', input.visaType]]
        case 'contact':
            return [['Looking for', input.interest]]
        case 'consultation':
            return [['Service', input.service]]
        case 'flights':
            return [
                ['Origin', input.origin],
                ['Destination', input.destination],
                ['Depart', input.departDate],
                ['Return', input.returnDate],
                ['Passengers', input.passengers],
                ['Cabin', input.cabin],
            ]
        case 'hotels':
            return [
                ['Destination', input.destination],
                ['Check-in', input.checkIn],
                ['Check-out', input.checkOut],
                ['Rooms', input.rooms],
                ['Guests', input.guests],
            ]
        case 'cars':
            return [
                ['Pickup', input.pickup],
                ['Drop-off', input.dropoff],
                ['Pickup date', input.pickupDate],
                ['Passengers', input.passengers],
            ]
    }
}

function contactFields(input: InquiryInput): Field[] {
    return [
        ['Name', fullName(input)],
        ['Email', input.email],
        ['Phone', input.phone],
        ['Preferred contact', input.kind === 'onboarding' ? input.contactMethod : undefined],
    ]
}

function present(fields: Field[]): [string, string][] {
    return fields.filter((field): field is [string, string] => Boolean(field[1]))
}

function buildSubject(input: InquiryInput) {
    const where = place(input)
    return `${kindLabels[input.kind]}${where ? ` — ${where}` : ''} from ${fullName(input)}`.replace(
        /[\r\n]+/g,
        ' ',
    )
}

function buildText(input: InquiryInput) {
    const lines = (fields: Field[]) => present(fields).map(([label, value]) => `${label}: ${value}`).join('\n')
    const header = lines([...contactFields(input), ['Inquiry', kindLabels[input.kind]]])
    const sections = detailSections(input)
        .map(([title, fields]) => [title, lines(fields)] as const)
        .filter(([, text]) => text)
        .map(([title, text]) => `${title.toUpperCase()}\n${text}`)
    const body = message(input)
    return [header, ...sections, body].filter(Boolean).join('\n\n')
}

function eyebrow(text: string, color: string) {
    return `<p style="margin:0;font-family:${sans};font-size:11px;font-weight:500;letter-spacing:3.3px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`
}

function sectionHeading(text: string) {
    return `
        <tr><td style="padding:0 40px;">${eyebrow(text, colors.royal)}</td></tr>
        <tr><td style="padding:10px 40px 0;"><div style="height:1px;width:40px;background-color:${colors.goldDeep};line-height:1px;font-size:0;">&nbsp;</div></td></tr>`
}

function fieldRows(fields: [string, string][], linkEmail?: string) {
    return fields
        .map(([label, value], index) => {
            const border = index === fields.length - 1 ? '' : `border-bottom:1px solid rgba(22,55,101,0.10);`
            const safe = escapeHtml(value)
            const content =
                linkEmail && value === linkEmail
                    ? `<a href="mailto:${safe}" style="color:${colors.royal};text-decoration:underline;">${safe}</a>`
                    : safe
            return `
                <tr>
                    <td width="38%" valign="top" style="padding:12px 0;${border}font-family:${sans};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(22,55,101,0.65);">${escapeHtml(label)}</td>
                    <td valign="top" style="padding:12px 0;${border}font-family:${sans};font-size:15px;line-height:22px;color:${colors.ink};white-space:pre-wrap;">${content}</td>
                </tr>`
        })
        .join('')
}

function fieldTable(fields: [string, string][], linkEmail?: string) {
    return `
        <tr><td style="padding:8px 40px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${fieldRows(fields, linkEmail)}</table>
        </td></tr>`
}

function highlightStrip(highlights: [string, string][]) {
    if (!highlights.length) return ''
    const width = Math.floor(100 / highlights.length)
    const cells = highlights
        .map(([label, value], index) => `
            <td width="${width}%" valign="top" style="padding:18px 16px;${index ? `border-left:1px solid rgba(225,178,29,0.35);` : ''}">
                <p style="margin:0;font-family:${sans};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${colors.gold};">${escapeHtml(label)}</p>
                <p style="margin:6px 0 0;font-family:${sans};font-size:14px;line-height:20px;color:${colors.cream};">${escapeHtml(value)}</p>
            </td>`)
        .join('')
    return `
        <tr><td style="padding:0 40px 34px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.royal}" style="background-color:${colors.royal};"><tr>${cells}</tr></table>
        </td></tr>`
}

function buildHtml(input: InquiryInput, siteUrl: string) {
    const name = fullName(input)
    const where = place(input)
    const body = message(input)
    const isOnboarding = input.kind === 'onboarding'
    const byline = isOnboarding ? `from ${name} · ${input.service}` : `from ${name}`
    const highlights = isOnboarding ? highlightStrip(onboardingHighlights(input)) : ''
    const replySubject = encodeURIComponent(`Re: ${buildSubject(input)}`)
    const isQuestion = input.kind === 'question'
    const preheader = isQuestion
        ? `${name} asked a question about ${where}.`
        : `${name} sent a ${kindLabels[input.kind].toLowerCase()}${where ? ` for ${where}` : ''}.`

    const messageBlock = body
        ? `${sectionHeading(isQuestion ? 'Their question' : 'Their message')}
        <tr><td style="padding:16px 40px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="background-color:${colors.oat};border-left:3px solid ${colors.goldDeep};padding:18px 22px;font-family:${serif};font-size:16px;line-height:26px;color:${colors.ink};white-space:pre-wrap;">${escapeHtml(body)}</td></tr>
            </table>
        </td></tr>`
        : ''

    const detailsBlock = detailSections(input)
        .map(([title, fields]) => [title, present(fields)] as const)
        .filter(([, fields]) => fields.length)
        .map(([title, fields]) => `${sectionHeading(title)}${fieldTable(fields)}`)
        .join('')

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(buildSubject(input))}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${colors.oat};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.oat}" style="background-color:${colors.oat};">
<tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${colors.cream};border:1px solid rgba(22,55,101,0.15);">

        <tr><td align="center" bgcolor="${colors.royalDeep}" style="background-color:${colors.royalDeep};background-image:linear-gradient(160deg,${colors.royalDeep} 0%,${colors.royalNight} 100%);padding:34px 32px 30px;">
            <img src="${siteUrl}/logo.png" width="64" height="58" alt="" style="display:block;margin:0 auto 12px;border:0;">
            <p style="margin:0;font-family:${serif};font-size:30px;line-height:34px;letter-spacing:4px;color:${colors.gold};">AVENtures</p>
            <p style="margin:8px 0 0;font-family:${sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(250,247,240,0.65);">Global Resources &amp; Travel Agency</p>
        </td></tr>
        <tr><td bgcolor="${colors.gold}" style="height:4px;line-height:4px;font-size:0;background-color:${colors.gold};background-image:linear-gradient(90deg,#ddab12 0%,${colors.goldDeep} 50%,${colors.goldDark} 100%);">&nbsp;</td></tr>

        <tr><td style="padding:40px 40px 0;">${eyebrow(`New ${kindLabels[input.kind]}`, colors.royal)}</td></tr>
        <tr><td style="padding:12px 40px 0;font-family:${serif};font-size:30px;line-height:38px;color:${colors.ink};">${escapeHtml(where || 'A new conversation')}</td></tr>
        <tr><td style="padding:6px 40px 0;font-family:${sans};font-size:15px;line-height:24px;color:rgba(11,11,11,0.65);">${escapeHtml(byline)}</td></tr>
        <tr><td style="padding:22px 40px 32px;"><div style="height:1px;width:64px;background-color:${colors.goldDeep};line-height:1px;font-size:0;">&nbsp;</div></td></tr>
        ${highlights}

        ${sectionHeading('Guest')}
        ${fieldTable(present(contactFields(input)), input.email)}
        ${detailsBlock}
        ${messageBlock}

        <tr><td align="center" style="padding:4px 40px 44px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="${colors.royal}" style="background-color:${colors.royal};border:2px solid ${colors.gold};">
                    <a href="mailto:${escapeHtml(input.email)}?subject=${replySubject}" style="display:inline-block;padding:14px 34px;font-family:${sans};font-size:14px;font-weight:500;letter-spacing:1px;color:${colors.cream};text-decoration:none;">Reply to ${escapeHtml(input.firstName)}</a>
                </td>
            </tr></table>
        </td></tr>

        <tr><td align="center" bgcolor="${colors.royalNight}" style="background-color:${colors.royalNight};padding:28px 32px;">
            <p style="margin:0;font-family:${serif};font-size:17px;font-style:italic;color:${colors.gold};">Dream It. Plan It. Live the AVENture.</p>
            <p style="margin:10px 0 0;font-family:${sans};font-size:12px;line-height:19px;color:rgba(250,247,240,0.65);">Sent from the inquiry form on <a href="${siteUrl}" style="color:rgba(250,247,240,0.85);text-decoration:underline;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>.<br>Replying to this email goes straight to ${escapeHtml(input.email)}.</p>
        </td></tr>

    </table>
</td></tr>
</table>
</body>
</html>`
}

export function renderInquiryEmail(input: InquiryInput, siteUrl: string) {
    return {
        subject: buildSubject(input),
        text: buildText(input),
        html: buildHtml(input, siteUrl.replace(/\/$/, '')),
    }
}
