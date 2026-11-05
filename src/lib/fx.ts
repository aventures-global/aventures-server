/** PHP per 1 USD. Used for PDF presentment and one-time historical ledger conversion. */
export function getUsdPhpRate(): number {
    const raw = Number(process.env.USD_PHP_RATE ?? '58')
    return Number.isFinite(raw) && raw > 0 ? raw : 58
}

export function usdCentsToPhpCents(usdCents: number, rate = getUsdPhpRate()): number {
    return Math.round(usdCents * rate)
}

export function phpCentsToUsdCents(phpCents: number, rate = getUsdPhpRate()): number {
    return Math.round(phpCents / rate)
}
