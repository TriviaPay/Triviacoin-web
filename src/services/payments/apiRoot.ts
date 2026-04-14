import { ENV_CONFIG } from '../../config/env'

/** Append payments API version segment; avoid duplicating if already present. */
function withPaymentsApiPrefix(origin: string): string {
  const base = origin.replace(/\/$/, '')
  if (base.endsWith('/api/v1')) return base
  return `${base}/api/v1`
}

/**
 * Base URL for Stripe + PayPal only — paths like `/stripe/checkout-session` are under **`/api/v1`** on the server.
 *
 * Resolved as: `(VITE_PAYMENTS_API_URL || VITE_API_BASE_URL) + /api/v1`
 * Main app (`apiService`, etc.) stays on the raw API base without this prefix.
 */
export function paymentApiRoot(): string {
  const explicit = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)?.trim()
  const origin = explicit ? explicit.replace(/\/$/, '') : ENV_CONFIG.API_BASE_URL.replace(/\/$/, '')
  return withPaymentsApiPrefix(origin)
}
