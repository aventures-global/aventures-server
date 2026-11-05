/**
 * One-time ledger conversion: PHP → USD using USD_PHP_RATE (PHP per 1 USD).
 * Converts Quotation (+ items), Booking, Payment, and FinanceEntry rows still in PHP.
 * Clears quotation PDF keys so staff can regenerate with USD totals.
 */
import { getUsdPhpRate, phpCentsToUsdCents } from '../src/lib/fx.js'
import { prisma } from '../src/lib/prisma.js'

async function main() {
    const rate = getUsdPhpRate()
    console.log(`Converting PHP → USD at rate ${rate} PHP per 1 USD`)

    const [quotations, bookings, payments, finance] = await Promise.all([
        prisma.quotation.findMany({
            where: { currency: 'PHP' },
            include: { items: true },
        }),
        prisma.booking.findMany({ where: { currency: 'PHP' } }),
        prisma.payment.findMany({ where: { currency: 'PHP' } }),
        prisma.financeEntry.findMany({ where: { currency: 'PHP' } }),
    ])

    console.log(
        JSON.stringify(
            {
                quotations: quotations.length,
                bookings: bookings.length,
                payments: payments.length,
                finance: finance.length,
            },
            null,
            2,
        ),
    )

    await prisma.$transaction(async (tx) => {
        for (const quote of quotations) {
            for (const item of quote.items) {
                await tx.quotationItem.update({
                    where: { id: item.id },
                    data: {
                        unitCents: phpCentsToUsdCents(item.unitCents, rate),
                        lineCents: phpCentsToUsdCents(item.lineCents, rate),
                    },
                })
            }
            await tx.quotation.update({
                where: { id: quote.id },
                data: {
                    currency: 'USD',
                    subtotalCents: phpCentsToUsdCents(quote.subtotalCents, rate),
                    optionalCents: phpCentsToUsdCents(quote.optionalCents, rate),
                    totalCents: phpCentsToUsdCents(quote.totalCents, rate),
                    pdfStorageKey: null,
                    pdfContentType: null,
                    pdfSizeBytes: null,
                },
            })
        }

        for (const booking of bookings) {
            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    currency: 'USD',
                    totalCents: phpCentsToUsdCents(booking.totalCents, rate),
                    paidCents: phpCentsToUsdCents(booking.paidCents, rate),
                },
            })
        }

        for (const payment of payments) {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    currency: 'USD',
                    amountCents: phpCentsToUsdCents(payment.amountCents, rate),
                },
            })
        }

        for (const entry of finance) {
            await tx.financeEntry.update({
                where: { id: entry.id },
                data: {
                    currency: 'USD',
                    amountCents: phpCentsToUsdCents(entry.amountCents, rate),
                },
            })
        }
    })

    console.log('Done. Regenerate quotation PDFs in admin where needed.')
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
