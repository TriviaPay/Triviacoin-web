import { getStripe, retrievePaymentIntent } from '../services/stripeService.js'
import { markPaymentIntentStatus, markFulfilled } from '../data/orderStore.js'

function fulfillOrder(paymentIntent) {
  const id = paymentIntent.id
  if (!markFulfilled(id)) {
    console.log(`[webhook] skip duplicate fulfillment for ${id}`)
    return
  }
  const { metadata } = paymentIntent
  console.log(`[webhook] FULFILL payment ${id}`, {
    user_id: metadata?.user_id,
    product_id: metadata?.product_id,
    quantity: metadata?.quantity,
    amount_received: paymentIntent.amount_received,
  })
  // TODO: persist to DB, add gems, activate subscription, send receipt email, etc.
}

function fulfillFromSession(session) {
  const piRef = session.payment_intent
  const piId = typeof piRef === 'string' ? piRef : piRef?.id
  if (!piId) {
    console.warn('[webhook] checkout.session.completed without payment_intent', session.id)
    return
  }
  retrievePaymentIntent(piId)
    .then((pi) => {
      markPaymentIntentStatus(pi.id, 'success', {
        product_id: pi.metadata?.product_id ?? session.metadata?.product_id,
        user_id: pi.metadata?.user_id ?? session.metadata?.user_id,
      })
      fulfillOrder(pi)
    })
    .catch((err) => console.error('[webhook] retrieve PI for session', err))
}

/**
 * Express middleware: express.raw({ type: 'application/json' }) must run before this.
 */
export async function stripeWebhookHandler(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET missing')
    return res.status(500).send('Webhook not configured')
  }

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing stripe-signature')

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(req.body, sig, secret)
  } catch (err) {
    console.error('[webhook] signature verification failed', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        markPaymentIntentStatus(pi.id, 'success', {
          product_id: pi.metadata?.product_id,
          user_id: pi.metadata?.user_id,
        })
        fulfillOrder(pi)
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        markPaymentIntentStatus(pi.id, 'failed')
        break
      }
      case 'checkout.session.completed': {
        fulfillFromSession(event.data.object)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('[webhook] handler error', e)
    return res.status(500).json({ error: 'webhook handler failed' })
  }

  res.json({ received: true })
}
