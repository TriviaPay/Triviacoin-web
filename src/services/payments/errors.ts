export class PaymentApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PaymentApiError'
    this.status = status
  }
}

/** User-visible hint when the payments API is missing or unreachable (404, proxy 502, connection refused, etc.). */
export function paymentServiceNotFoundMessage(original: string): string {
  const t = original.toLowerCase()
  const looksUnreachable =
    t.includes('not found') ||
    t.includes('404') ||
    t.includes('502') ||
    t.includes('bad gateway') ||
    t.includes('failed to fetch') ||
    t.includes('networkerror') ||
    t.includes('load failed')
  if (!looksUnreachable) return original
  return `${original} — Payments endpoints were not found or the server did not respond. Use the same VITE_API_BASE_URL as your main API if Stripe/PayPal are on that host, or set VITE_PAYMENTS_API_URL to the deployment that serves /stripe and /paypal. Ensure PAYPAL_CLIENT_ID (and related secrets) are configured on that server.`
}

export function formatPaymentApiError(data: unknown, fallback: string): string {
  const d = data as { detail?: unknown; error?: string; message?: string }
  if (typeof d?.error === 'string' && d.error) return d.error
  if (typeof d?.message === 'string' && d.message) return d.message
  const det = d?.detail
  if (typeof det === 'string') return det
  if (Array.isArray(det)) {
    return det
      .map((x) => (typeof x === 'object' && x && 'msg' in x ? String((x as { msg: string }).msg) : String(x)))
      .join('. ')
  }
  return fallback
}
