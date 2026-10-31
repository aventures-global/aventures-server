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
    subtotalCents: number
    optionalCents: number
    totalCents: number
    items: QuotationPdfItem[]
    business: BusinessSettings
    brandName?: string
}

export async function buildQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
    })

    const brand = input.brandName ?? 'AVENtures'
    doc.fillColor('#163765').fontSize(20).text(brand, { continued: false })
    doc.fontSize(10).fillColor('#555555').text(input.business.email)
    if (input.business.phoneDisplay) doc.text(input.business.phoneDisplay)
    for (const line of input.business.addressLines) doc.text(line)

    doc.moveDown()
    doc.fillColor('#163765').fontSize(16).text('Quotation')
    doc.fontSize(11).fillColor('#222222')
    doc.text(`Number: ${input.number}`)
    doc.text(`Status: ${input.status}`)
    doc.text(`Title: ${input.title}`)
    if (input.validUntil) {
        doc.text(`Valid until: ${input.validUntil.toLocaleDateString()}`)
    }

    doc.moveDown(0.5)
    doc.fontSize(11).text(`Customer: ${input.customerName}`)
    if (input.customerEmail) doc.text(`Email: ${input.customerEmail}`)

    if (input.customerMessage) {
        doc.moveDown(0.5)
        doc.fillColor('#444444').fontSize(10).text(input.customerMessage, { width: 500 })
    }

    doc.moveDown()
    doc.fillColor('#163765').fontSize(12).text('Line items')
    doc.moveDown(0.3)

    for (const item of input.items) {
        const optionalTag = item.isOptional ? ' (optional)' : ''
        const selectedTag = item.isOptional && !item.selected ? ' — not selected' : ''
        doc.fillColor('#222222').fontSize(10).text(`${item.title}${optionalTag}${selectedTag}`, { continued: false })
        if (item.description) {
            doc.fillColor('#666666').fontSize(9).text(item.description, { width: 480 })
        }
        doc
            .fillColor('#222222')
            .fontSize(9)
            .text(
                `${item.quantity} × ${formatMoney(item.unitCents, input.currency)} = ${formatMoney(item.lineCents, input.currency)}`,
            )
        doc.moveDown(0.35)
    }

    doc.moveDown(0.5)
    doc.fillColor('#163765').fontSize(11)
    doc.text(`Subtotal: ${formatMoney(input.subtotalCents, input.currency)}`)
    if (input.optionalCents > 0) {
        doc.text(`Optional (selected): ${formatMoney(input.optionalCents, input.currency)}`)
    }
    doc.fontSize(13).text(`Total: ${formatMoney(input.totalCents, input.currency)}`)

    doc.moveDown(1.5)
    doc.fillColor('#888888').fontSize(8).text('This quotation is for tracking and review. Online payment is not included.')

    doc.end()
    return done
}
