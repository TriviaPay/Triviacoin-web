/**
 * In-memory store for demo / local dev. Swap for PostgreSQL, Redis, etc. in production.
 * Webhook handler is the source of truth for fulfillment — GET status reads Stripe + optional local mirror.
 */

/** @type {Map<string, { status: string, product_id?: string, user_id?: string, updatedAt: string }>} */
const byPaymentIntent = new Map()

/** @type {Map<string, { product_id?: string, user_id?: string, updatedAt: string }>} */
const byCheckoutSession = new Map()

export function recordCheckoutSession(sessionId, { product_id, user_id }) {
  byCheckoutSession.set(sessionId, {
    product_id,
    user_id,
    updatedAt: new Date().toISOString(),
  })
}

export function recordIntentCreated(paymentIntentId, { product_id, user_id }) {
  byPaymentIntent.set(paymentIntentId, {
    status: 'pending',
    product_id,
    user_id,
    updatedAt: new Date().toISOString(),
  })
}

export function markPaymentIntentStatus(paymentIntentId, status, extra = {}) {
  const prev = byPaymentIntent.get(paymentIntentId) ?? {}
  byPaymentIntent.set(paymentIntentId, {
    ...prev,
    status,
    ...extra,
    updatedAt: new Date().toISOString(),
  })
}

export function getOrderByPaymentIntent(paymentIntentId) {
  return byPaymentIntent.get(paymentIntentId) ?? null
}

/**
 * Idempotency: grant gems / entitlements exactly once per successful payment.
 * @type {Set<string>}
 */
const fulfilledIds = new Set()

export function markFulfilled(paymentIntentId) {
  if (fulfilledIds.has(paymentIntentId)) return false
  fulfilledIds.add(paymentIntentId)
  return true
}
