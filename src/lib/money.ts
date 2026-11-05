export function formatMoney(cents: number, currency = 'USD'): string {
    const code = currency.trim().toUpperCase() || 'USD'
    const amount = cents / 100
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        return `${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} ${code}`
    }
}

export function parsePriceToCents(price: string): number {
    const match = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
    if (!match) return 0
    return Math.round(Number(match[1]) * 100)
}
