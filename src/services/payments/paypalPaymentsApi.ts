/**
 * PayPal — matches hosted API under `/paypal`.
 *
 * Server routes are under **`/api/v1`** (e.g. `GET /api/v1/paypal/client-id`). `paymentApiRoot()` includes that prefix.
 *
 * | Method | Path (after `/api/v1`) | Auth | Frontend |
 * |--------|-------------------------|------|----------|
 * | GET | `/paypal/client-id` | none | `getPayPalClientId` |
 * | POST | `/paypal/create-order` | Bearer | `createPayPalOrder` |
 * | POST | `/paypal/capture-order` | Bearer | `capturePayPalOrder` |
 * | GET | `/paypal/subscription-config?product_id=` | Bearer | `getPayPalSubscriptionConfig` |
 * | POST | `/paypal/subscription-approved` | Bearer | `postPayPalSubscriptionApproved` |
 * | GET | `/paypal/order-status?checkout_id=` | Bearer | `getPayPalOrderStatus` |
 * | POST | `/paypal/webhook` | _(PayPal)_ | _(server only)_ |
 *
 * One-time flow: create-order body `{ product_id }` — amount from server catalog.
 */
import { paymentApiRoot } from './apiRoot'
import { formatPaymentApiError, PaymentApiError } from './errors'

export type PayPalClientIdResponse = {
  client_id: string
  mode: string
}

export type PayPalCreateOrderResponse = {
  paypal_order_id: string
}

export type PayPalCaptureOrderResponse = {
  payment_status: string
  fulfillment_status: string
  gems_credited: number
  asset_granted: boolean
}

export type PayPalOrderStatusResponse = {
  payment_status: string
  fulfillment_status: string
  product_id: string
  product_type: string
  gems_credited: number
  asset_granted: boolean
}

export type PayPalSubscriptionConfigResponse = {
  paypal_plan_id: string
  product_id: string
}

export type PayPalSubscriptionApprovedResponse = {
  payment_status: string
  fulfillment_status: string
}

function authHeaders(token: string | null, json = false): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (json) h['Content-Type'] = 'application/json'
  if (token?.trim()) h.Authorization = `Bearer ${token.trim()}`
  return h
}

/** GET `/paypal/client-id` — public; used to load the PayPal JS SDK. */
export async function getPayPalClientId(): Promise<PayPalClientIdResponse> {
  const base = paymentApiRoot()
  const res = await fetch(`${base}/paypal/client-id`, { headers: authHeaders(null) })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  const client_id = data.client_id as string | undefined
  const mode = (data.mode as string) || 'sandbox'
  if (!client_id) throw new PaymentApiError('Invalid PayPal client-id response', 502)
  return { client_id, mode }
}

/** POST `/paypal/create-order` — returns `paypal_order_id` for the SDK `createOrder` callback. */
export async function createPayPalOrder(productId: string, accessToken: string | null): Promise<string> {
  const base = paymentApiRoot()
  const body: Record<string, unknown> = { product_id: productId }
  const res = await fetch(`${base}/paypal/create-order`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  const id = data.paypal_order_id as string | undefined
  if (!id) throw new PaymentApiError('Invalid create-order response', 502)
  return id
}

/** POST `/paypal/capture-order` — after Smart Buttons `onApprove`. */
export async function capturePayPalOrder(
  paypalOrderId: string,
  accessToken: string | null,
): Promise<PayPalCaptureOrderResponse> {
  const base = paymentApiRoot()
  const res = await fetch(`${base}/paypal/capture-order`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({ paypal_order_id: paypalOrderId }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  return data as unknown as PayPalCaptureOrderResponse
}

/** GET `/paypal/order-status?checkout_id=` — `checkout_id` is the PayPal order id from create-order. */
export async function getPayPalOrderStatus(
  checkoutId: string,
  accessToken: string | null,
): Promise<PayPalOrderStatusResponse> {
  const q = new URLSearchParams({ checkout_id: checkoutId })
  const base = paymentApiRoot()
  const res = await fetch(`${base}/paypal/order-status?${q}`, { headers: authHeaders(accessToken) })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  return data as unknown as PayPalOrderStatusResponse
}

/** GET `/paypal/subscription-config?product_id=SUB001` — returns `paypal_plan_id` for the SDK `createSubscription` callback. */
export async function getPayPalSubscriptionConfig(
  productId: string,
  accessToken: string | null,
): Promise<{ paypal_plan_id: string; product_id: string }> {
  const q = new URLSearchParams({ product_id: productId })
  const base = paymentApiRoot()
  const res = await fetch(`${base}/paypal/subscription-config?${q}`, { headers: authHeaders(accessToken) })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  const plan_id = data.paypal_plan_id as string | undefined
  if (!plan_id) throw new PaymentApiError('Invalid subscription-config response', 502)
  return { paypal_plan_id: plan_id, product_id: productId }
}

/** POST `/paypal/subscription-approved` — after subscription `onApprove` (fulfillment may complete async via webhook). */
export async function postPayPalSubscriptionApproved(
  paypalSubscriptionId: string,
  productId: string,
  accessToken: string | null,
): Promise<PayPalSubscriptionApprovedResponse> {
  const base = paymentApiRoot()
  const res = await fetch(`${base}/paypal/subscription-approved`, {
    method: 'POST',
    headers: authHeaders(accessToken, true),
    body: JSON.stringify({
      paypal_subscription_id: paypalSubscriptionId,
      product_id: productId,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentApiError(formatPaymentApiError(data, `HTTP ${res.status}`), res.status)
  }
  return data as unknown as PayPalSubscriptionApprovedResponse
}
