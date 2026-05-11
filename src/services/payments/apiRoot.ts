import { ENV_CONFIG } from '../../config/env'

/**
 * Public deployed API used for Stripe/PayPal when `VITE_API_BASE_URL` (or payments URL) points at localhost.
 * Must match your production payments host (same default as `VITE_API_BASE_URL` in `env.ts`).
 */
const DEPLOYED_PAYMENTS_ORIGIN = 'https://trivia-back-end.vercel.app'

function isLocalhostOrigin(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`
    const host = new URL(withProto).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return /\blocalhost\b|127\.0\.0\.1/i.test(t)
  }
}

/** Append payments API version segment; avoid duplicating if already present. */
function withPaymentsApiPrefix(origin: string): string {
  const base = origin.replace(/\/$/, '')
  if (base.endsWith('/api/v1')) return base
  return `${base}/api/v1`
}

/**
 * Base URL for Stripe + PayPal — paths like `/stripe/checkout-session` live under **`/api/v1`**.
 *
 * Uses `VITE_PAYMENTS_API_URL` if set, otherwise `VITE_API_BASE_URL` / `ENV_CONFIG.API_BASE_URL`.
 * **If that origin is localhost, payments are sent to the deployed backend** (`DEPLOYED_PAYMENTS_ORIGIN`)
 * so card/PayPal flows always hit your hosted API. Override with a non-local `VITE_PAYMENTS_API_URL` if needed.
 */
export function paymentApiRoot(): string {
  const explicit = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)?.trim()
  let origin = explicit ? explicit.replace(/\/$/, '') : ENV_CONFIG.API_BASE_URL.replace(/\/$/, '')
  if (isLocalhostOrigin(origin)) {
    origin = DEPLOYED_PAYMENTS_ORIGIN.replace(/\/$/, '')
  }
  return withPaymentsApiPrefix(origin)
}
