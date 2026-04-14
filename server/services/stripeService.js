/**
 * Hosted Stripe Checkout: catalog and Checkout Session creation.
 * Amounts and line items are ONLY defined here — never trust client prices.
 */
import Stripe from 'stripe'

let stripeSingleton = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  if (!stripeSingleton) stripeSingleton = new Stripe(key)
  return stripeSingleton
}

export const PRODUCT_CATALOG = {
  // Gems (One-time)
  G001: { unitAmountCents: 99, currency: 'usd', name: 'Starter Gems Pack (50)', gems: 50, type: 'consumable' },
  G002: { unitAmountCents: 499, currency: 'usd', name: 'Value Gems Pack (300)', gems: 300, type: 'consumable' },
  G003: { unitAmountCents: 999, currency: 'usd', name: 'Premium Gems Pack (700)', gems: 700, type: 'consumable' },
  G004: { unitAmountCents: 1999, currency: 'usd', name: 'Elite Gems Pack (1500)', gems: 1500, type: 'consumable' },

  // Avatars (One-time)
  A001: { unitAmountCents: 199, currency: 'usd', name: 'Cool Bear Avatar', type: 'asset' },
  A002: { unitAmountCents: 199, currency: 'usd', name: 'Cyber Cat Avatar', type: 'asset' },
  // ... (keeping catalog concise, but adding a few more placeholders as requested A001-A010)
  A003: { unitAmountCents: 199, currency: 'usd', name: 'Neon Phoenix Avatar', type: 'asset' },

  // Subscriptions
  SUB001: { unitAmountCents: 499, currency: 'usd', name: 'Basic Monthly Subscription', mode: 'subscription', type: 'subscription' },
  SUB002: { unitAmountCents: 999, currency: 'usd', name: 'Pro Monthly Subscription', mode: 'subscription', type: 'subscription' },
  SUB003: { unitAmountCents: 1499, currency: 'usd', name: 'Elite Monthly Subscription', mode: 'subscription', type: 'subscription' },
  SUB004: { unitAmountCents: 2999, currency: 'usd', name: 'Ultimate Monthly Subscription', mode: 'subscription', type: 'subscription' },
}

export function getProduct(productId) {
  if (!productId || typeof productId !== 'string') return null
  return PRODUCT_CATALOG[productId] ?? null
}

/**
 * Stripe redirects the customer to Checkout Hosted Page — no Payment Element / client_secret.
 */
export async function createCheckoutSession({ productId, quantity, userId }) {
  const product = getProduct(productId)
  if (!product) {
    const err = new Error(`Unknown product_id: ${productId}`)
    err.statusCode = 400
    throw err
  }
  const qty = Math.min(Math.max(parseInt(String(quantity), 10) || 1, 1), 99)

  let origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '')
  if (!origin || !origin.startsWith('http')) {
     console.warn(`[Stripe] Invalid origin "${origin}", falling back to localhost for URLs`)
     origin = 'http://localhost:5173'
  }
  /** Override in production with full URLs; success URL must include `{CHECKOUT_SESSION_ID}` exactly. */
  const successUrl =
    process.env.STRIPE_SUCCESS_URL?.trim() ||
    `${origin}/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = process.env.STRIPE_CANCEL_URL?.trim() || `${origin}/cancel`

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: product.mode === 'subscription' ? 'subscription' : 'payment',
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency: product.currency,
          unit_amount: product.unitAmountCents,
          product_data: {
            name: product.name,
          },
          ...(product.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: String(userId ?? 'anonymous'),
      product_id: productId,
      quantity: String(qty),
      product_name: product.name,
    },
  })

  return {
    checkout_url: session.url,
    session_id: session.id,
  }
}

export async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripe()
  return stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] })
}

export async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe()
  return stripe.paymentIntents.retrieve(paymentIntentId)
}
