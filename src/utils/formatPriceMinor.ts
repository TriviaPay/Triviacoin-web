/** Human-readable billing cadence (display only). */
export function formatBillingInterval(interval: string): string {
  const i = interval.toLowerCase().replace(/_/g, ' ')
  if (i === 'month' || i === 'monthly' || i === 'per month') return 'per month'
  return interval
}

/** Display-only: `price_minor` is smallest currency unit (e.g. cents). */
export function formatPriceMinor(minor: number, currency: string): string {
  const n = minor / 100
  const cur = (currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n)
  } catch {
    return cur === 'USD' ? `$${n.toFixed(2)}` : `${n.toFixed(2)} ${cur}`
  }
}
