/**
 * Stripe — matches hosted API under `/stripe` (same base as `VITE_API_BASE_URL` unless `VITE_PAYMENTS_API_URL` is set).
 *
 * Server routes are under **`/api/v1`** (e.g. `POST /api/v1/stripe/checkout-session`). `paymentApiRoot()` includes that prefix.
 *
 * | Method | Path (after `/api/v1`) | Auth | Frontend |
 * |--------|------------------------|------|----------|
 * | POST | `/stripe/checkout-session` | Bearer | `createStripeCheckoutSession` |
 * | GET | `/stripe/session-status?session_id=` | Bearer | `getStripeSessionStatus` |
 * | POST | `/stripe/webhook` | Stripe-Signature | _(server only)_ |
 *
 * Checkout body: `{ product_id }` from store/cosmetics listings — pricing is server-side only.
 */
import { paymentApiRoot } from './apiRoot'
import { formatPaymentApiError, PaymentApiError } from './errors'

export type StripeCheckoutSessionResponse = {
  checkout_url: string
  session_id: string
}

export type StripeSessionStatusResponse = {
  payment_status: string
  fulfillment_status: string
  product_id: string
  product_type: string
  price_minor: number
  gems_credited: number
  asset_granted: boolean
  completed_at?: string | null
}

function authHeaders(token: string | null, json = false): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (json) h['Content-Type'] = 'application/json'
  if (token?.trim()) h.Authorization = `Bearer ${token.trim()}`
  return h
}

/** POST `/stripe/checkout-session` → `{ checkout_url, session_id }`. Redirect browser to `checkout_url`. */
export async function createStripeCheckoutSession(
  productId: string,
  accessToken: string | null,
): Promise<StripeCheckoutSessionResponse> {
  const base = paymentApiRoot()
  const body: Record<string, unknown> = { product_id: productId }
  const res = await fetch(`${base}/stripe/checkout-session`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  const checkout_url = data.checkout_url as string | undefined
  const session_id = data.session_id as string | undefined
  if (!checkout_url || !session_id) throw new PaymentApiError('Invalid checkout session response', 502)
  return { checkout_url, session_id }
}

/** GET `/stripe/session-status?session_id=...` — poll after return from Stripe Checkout. */
export async function getStripeSessionStatus(
  sessionId: string,
  accessToken: string | null,
): Promise<StripeSessionStatusResponse> {
  const q = new URLSearchParams({ session_id: sessionId })
  const base = paymentApiRoot()
  const res = await fetch(`${base}/stripe/session-status?${q}`, { headers: authHeaders(accessToken) })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  return data as unknown as StripeSessionStatusResponse
}
