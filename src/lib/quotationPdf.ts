import PDFDocument from 'pdfkit'

import { formatMoney } from './money.js'
import type { BusinessSettings } from './businessSettings.js'

export type QuotationPdfItem = {
    title: string
    description: string | null
    quantity: number
    unitCents: number
    lineCents: number
    isOptional: boolean
    selected: boolean
    kind: string
}

export type QuotationPdfInput = {
    number: string
    title: string
    currency: string
    status: string
    customerName: string
    customerEmail: string | null
    customerMessage: string | null
    validUntil: Date | null
    issuedAt?: Date | null
    subtotalCents: number
    optionalCents: number
    totalCents: number
    items: QuotationPdfItem[]
    business: BusinessSettings
    brandName?: string
    /** When set, totals include an approximate PHP equivalent (presentment only). */
    phpEquivalentCents?: number | null
    usdPhpRate?: number | null
}

const ROYAL = '#163765'
const INK = '#0b0b0b'
const MUTED = '#6b7280'
const RULE = '#d7d2c8'
const BAND = '#f5f0e7'
const WHITE = '#ffffff'

const PAGE_MARGIN = 48
const FOOTER_TOP = 36

function formatDate(value: Date | null | undefined) {
    if (!value) return '—'
    return value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Single-line text that must not trigger PDFKit's automatic page break. */
function textAt(
    doc: PDFKit.PDFDocument,
    value: string,
    x: number,
    y: number,
    options: { width?: number; align?: 'left' | 'center' | 'right' | 'justify' } = {},
) {
    doc.text(value, x, y, { ...options, lineBreak: false })
}

export async function buildQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
    // Manual layout — default bottom margin is what made footers spawn blank pages.
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
    })

    const brand = input.brandName ?? 'AVENtures'
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const left = PAGE_MARGIN
    const right = pageWidth - PAGE_MARGIN
    const contentWidth = right - left
    const contentBottom = pageHeight - FOOTER_TOP - 16

    // Header band
    doc.rect(0, 0, pageWidth, 92).fill(BAND)
    doc.fillColor(ROYAL).font('Helvetica-Bold').fontSize(22)
    textAt(doc, brand, left, 28)
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    textAt(doc, input.business.email, left, 56)
    if (input.business.phoneDisplay) {
        textAt(doc, input.business.phoneDisplay, left, 68)
    }

    doc.fillColor(ROYAL).font('Helvetica-Bold').fontSize(18)
    textAt(doc, 'QUOTATION', left, 30, { width: contentWidth, align: 'right' })
    doc.fillColor(INK).font('Helvetica').fontSize(10)
    textAt(doc, input.number, left, 54, { width: contentWidth, align: 'right' })
    doc.fillColor(MUTED).fontSize(8)
    textAt(doc, input.status.replaceAll('_', ' '), left, 68, { width: contentWidth, align: 'right' })

    doc.fillColor(ROYAL).rect(left, 92, contentWidth, 2).fill()

    let y = 112

    const ensureSpace = (needed: number) => {
        if (y + needed <= contentBottom) return
        doc.addPage()
        y = PAGE_MARGIN
    }

    // Quote title
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13)
    const titleHeight = doc.heightOfString(input.title, { width: contentWidth })
    ensureSpace(titleHeight + 14)
    doc.text(input.title, left, y, { width: contentWidth })
    y = doc.y + 14

    // Meta panels
    const colGap = 24
    const colWidth = (contentWidth - colGap) / 2
    const metaTop = y
    const rightX = left + colWidth + colGap

    ensureSpace(56)
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
    textAt(doc, 'PREPARED FOR', left, metaTop)
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
    doc.text(input.customerName, left, metaTop + 14, { width: colWidth })
    let leftY = doc.y + 2
    if (input.customerEmail) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(9)
        doc.text(input.customerEmail, left, leftY, { width: colWidth })
        leftY = doc.y + 2
    }

    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
    textAt(doc, 'QUOTE DETAILS', rightX, metaTop)
    doc.fillColor(INK).font('Helvetica').fontSize(9)
    const detailLines = [
        `Issued: ${formatDate(input.issuedAt ?? new Date())}`,
        `Valid until: ${formatDate(input.validUntil)}`,
        `Currency: ${input.currency}`,
    ]
    let rightY = metaTop + 14
    for (const line of detailLines) {
        textAt(doc, line, rightX, rightY)
        rightY += 12
    }

    y = Math.max(leftY, rightY) + 16

    if (input.customerMessage) {
        doc.font('Helvetica').fontSize(9)
        const messageHeight = doc.heightOfString(input.customerMessage, { width: contentWidth })
        ensureSpace(24 + messageHeight)
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
        textAt(doc, 'MESSAGE', left, y)
        y += 12
        doc.fillColor(INK).font('Helvetica').fontSize(9)
        doc.text(input.customerMessage, left, y, { width: contentWidth, lineGap: 2 })
        y = doc.y + 16
    }

    // Table columns
    const qtyX = left + contentWidth * 0.58
    const unitX = left + contentWidth * 0.68
    const amountX = left + contentWidth * 0.84
    const descWidth = qtyX - left - 8

    ensureSpace(40)
    doc.rect(left, y, contentWidth, 22).fill(ROYAL)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
    textAt(doc, 'DESCRIPTION', left + 8, y + 7)
    textAt(doc, 'QTY', qtyX, y + 7, { width: unitX - qtyX - 4, align: 'right' })
    textAt(doc, 'UNIT', unitX, y + 7, { width: amountX - unitX - 4, align: 'right' })
    textAt(doc, 'AMOUNT', amountX, y + 7, { width: right - amountX, align: 'right' })
    y += 28

    const visibleItems = input.items.filter((item) => item.selected !== false)

    for (const item of visibleItems) {
        const tags: string[] = []
        if (item.isOptional) tags.push('Optional')
        if (item.kind && item.kind !== 'SERVICE' && item.kind !== 'OPTIONAL') {
            tags.push(item.kind.charAt(0) + item.kind.slice(1).toLowerCase())
        }

        doc.font('Helvetica-Bold').fontSize(9)
        const titleH = doc.heightOfString(item.title, { width: descWidth })
        doc.font('Helvetica').fontSize(8)
        const descH = item.description ? doc.heightOfString(item.description, { width: descWidth }) : 0
        const tagH = tags.length ? 10 : 0
        const rowHeight = Math.max(22, titleH + descH + tagH + 10)

        ensureSpace(rowHeight + 4)

        const rowTop = y
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(9)
        doc.text(item.title, left + 8, rowTop, { width: descWidth })
        let textY = doc.y
        if (item.description) {
            doc.fillColor(MUTED).font('Helvetica').fontSize(8)
            doc.text(item.description, left + 8, textY + 1, { width: descWidth })
            textY = doc.y
        }
        if (tags.length) {
            doc.fillColor(ROYAL).font('Helvetica').fontSize(7)
            textAt(doc, tags.join(' · '), left + 8, textY + 2)
        }

        const valueY = rowTop + 2
        doc.fillColor(INK).font('Helvetica').fontSize(9)
        textAt(doc, String(item.quantity), qtyX, valueY, { width: unitX - qtyX - 4, align: 'right' })
        textAt(doc, formatMoney(item.unitCents, input.currency), unitX, valueY, {
            width: amountX - unitX - 4,
            align: 'right',
        })
        doc.font('Helvetica-Bold')
        textAt(doc, formatMoney(item.lineCents, input.currency), amountX, valueY, {
            width: right - amountX,
            align: 'right',
        })

        y = rowTop + rowHeight
        doc
            .strokeColor(RULE)
            .lineWidth(0.5)
            .moveTo(left, y - 4)
            .lineTo(right, y - 4)
            .stroke()
    }

    if (visibleItems.length === 0) {
        ensureSpace(30)
        doc.fillColor(MUTED).font('Helvetica').fontSize(9)
        textAt(doc, 'No selected line items.', left + 8, y)
        y += 24
    }

    y += 10
    ensureSpace(90)

    const totalsWidth = 220
    const totalsX = right - totalsWidth
    const drawTotalRow = (label: string, value: string, bold = false) => {
        doc
            .fillColor(bold ? INK : MUTED)
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(bold ? 11 : 9)
        textAt(doc, label, totalsX, y, { width: 110 })
        doc.fillColor(INK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
        textAt(doc, value, totalsX + 110, y, { width: 110, align: 'right' })
        y += bold ? 18 : 14
    }

    drawTotalRow('Subtotal', formatMoney(input.subtotalCents, input.currency))
    if (input.optionalCents > 0) {
        drawTotalRow('Optional selected', formatMoney(input.optionalCents, input.currency))
    }
    doc.strokeColor(ROYAL).lineWidth(1).moveTo(totalsX, y).lineTo(right, y).stroke()
    y += 8
    drawTotalRow('Total', formatMoney(input.totalCents, input.currency), true)

    if (input.phpEquivalentCents != null && input.phpEquivalentCents > 0) {
        y += 4
        ensureSpace(36)
        drawTotalRow('Approx. PHP', formatMoney(input.phpEquivalentCents, 'PHP'))
        const rateNote =
            input.usdPhpRate != null
                ? `Indicative conversion at ${input.usdPhpRate.toFixed(2)} PHP per 1 USD. Final charge may differ at checkout.`
                : 'Indicative conversion for reference. Final charge may differ at checkout.'
        doc.fillColor(MUTED).font('Helvetica').fontSize(7)
        const noteHeight = doc.heightOfString(rateNote, { width: totalsWidth })
        ensureSpace(noteHeight + 8)
        doc.text(rateNote, totalsX, y, { width: totalsWidth, lineGap: 1 })
        y += noteHeight + 4
    }

    y += 24
    ensureSpace(70)
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
    textAt(doc, 'OFFICE', left, y)
    y += 12
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    for (const line of input.business.addressLines) {
        textAt(doc, line, left, y)
        y += 11
    }

    y += 16
    const terms =
        'This quotation is for review and tracking. Prices may change after the validity date. Online payment is not included.'
    doc.font('Helvetica').fontSize(8)
    const termsHeight = doc.heightOfString(terms, { width: contentWidth })
    ensureSpace(termsHeight + 4)
    doc.fillColor(MUTED).text(terms, left, y, { width: contentWidth, lineGap: 1.5 })

    // Footers on every real page — lineBreak:false keeps these from spawning blanks.
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i)
        const footerY = pageHeight - 28
        doc
            .strokeColor(RULE)
            .lineWidth(0.5)
            .moveTo(left, pageHeight - FOOTER_TOP)
            .lineTo(right, pageHeight - FOOTER_TOP)
            .stroke()
        doc.fillColor(MUTED).font('Helvetica').fontSize(7)
        textAt(doc, `${brand} · ${input.number}`, left, footerY)
        textAt(doc, `Page ${i + 1} of ${range.count}`, left, footerY, {
            width: contentWidth,
            align: 'right',
        })
    }

    doc.end()
    return done
}
