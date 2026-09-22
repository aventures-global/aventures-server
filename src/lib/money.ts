export function formatMoney(cents: number, currency = 'USD'): string {
  if (currency === 'USD') {
    return `$${Math.round(cents / 100)}`
  }
  return `${(cents / 100).toFixed(2)} ${currency}`
}

export function parsePriceToCents(price: string): number {
  const match = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return 0
  return Math.round(Number(match[1]) * 100)
}
