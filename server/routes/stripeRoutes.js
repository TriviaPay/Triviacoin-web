import { createCheckoutSession, retrieveCheckoutSession, getProduct } from '../services/stripeService.js'
import { recordCheckoutSession } from '../data/orderStore.js'

const router = Router()

function userIdFromAuthorization(header) {
  if (!header || !header.startsWith('Bearer ')) return 'guest'
  const jwt = header.slice(7).trim()
  const parts = jwt.split('.')
  if (parts.length !== 3) return 'guest'
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return String(payload.sub ?? payload.user_id ?? payload.id ?? 'guest')
  } catch {
    return 'guest'
  }
}

// 1. POST /api/v1/stripe/checkout-session
router.post('/checkout-session', async (req, res) => {
  try {
    const { product_id: productId } = req.body ?? {}
    if (!productId) return res.status(400).json({ error: 'product_id is required' })

    const product = getProduct(productId)
    if (!product) return res.status(400).json({ error: 'invalid product_id' })

    const userId = userIdFromAuthorization(req.headers.authorization)
    const result = await createCheckoutSession({
      productId,
      userId,
    })

    // IDEMPOTENCY/TRACKING: Store the session mapping so we can fulfill on return or webhook
    recordCheckoutSession(result.session_id, {
      product_id: productId,
      user_id: userId,
    })

    return res.json({
      checkout_url: result.checkout_url,
      session_id: result.session_id,
    })
  } catch (e) {
    console.error('[stripe/checkout-session]', e)
    const status = e.statusCode || 500
    return res.status(status).json({ 
      error: e.message || 'Internal Server Error',
      detail: e.raw?.message || e.stack // Useful for debugging 500s
    })
  }
})

// 2. GET /api/v1/stripe/session-status?session_id=cs_test_...
router.get('/session-status', async (req, res) => {
  const sessionId = req.query.session_id
  if (!sessionId) return res.status(400).json({ error: 'session_id is required' })

  try {
    const session = await retrieveCheckoutSession(sessionId)
    const product = getProduct(session.metadata.product_id)

    return res.json({
      payment_status: session.payment_status,
      fulfillment_status: session.payment_status === 'paid' ? 'fulfilled' : 'pending',
      product_id: session.metadata.product_id,
      product_type: product?.type ?? 'unknown',
      price_minor: session.amount_total,
      gems_credited: product?.gems ?? 0,
      asset_granted: product?.type === 'asset',
      completed_at: new Date().toISOString(), // Simplified for demo
    })
  } catch (e) {
    console.error('[stripe/session-status]', e)
    return res.status(500).json({ error: 'failed to load session status' })
  }
})

export default router
