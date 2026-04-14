import { Router } from 'express'

const router = Router()

// Mock data/logic for PayPal as requested "already mapped in the backend db"
const PAYPAL_PLAN_MAPPING = {
  'SUB001': 'P-47J10301DR216070UNHF5KHI',
  'SUB002': 'P-58K21412ES327181VOHG6LIJ',
  'SUB003': 'P-69L32523FT438292WPIH7MJK',
  'SUB004': 'P-70M43634GU549303XQJI8NLK'
}

const PRODUCT_DETAILS = {
  'G001': { gems: 50, asset: false },
  'G002': { gems: 300, asset: false },
  'G003': { gems: 700, asset: false },
  'G004': { gems: 1500, asset: false },
  'A001': { gems: 0, asset: true },
}

// 1. GET /api/v1/paypal/client-id
router.get('/client-id', (req, res) => {
  res.json({
    client_id: process.env.PAYPAL_CLIENT_ID || 'AXxx...',
    mode: 'sandbox'
  })
})

// 2. POST /api/v1/paypal/create-order
router.post('/create-order', (req, res) => {
  const { product_id } = req.body
  console.log('[paypal/create-order]', product_id)
  res.json({ paypal_order_id: `O-${Math.random().toString(36).substring(7).toUpperCase()}` })
})

// 3. POST /api/v1/paypal/capture-order
router.post('/capture-order', (req, res) => {
  const { paypal_order_id } = req.body
  const product_id = 'G001' // In real app, look up by order id
  const details = PRODUCT_DETAILS[product_id] || { gems: 0, asset: false }
  
  res.json({
    payment_status: 'completed',
    fulfillment_status: 'fulfilled',
    gems_credited: details.gems,
    asset_granted: details.asset
  })
})

// 4. GET /api/v1/paypal/subscription-config?product_id=SUB001
router.get('/subscription-config', (req, res) => {
  const { product_id } = req.query
  if (!product_id || !PAYPAL_PLAN_MAPPING[product_id]) {
    return res.status(400).json({ error: 'invalid product_id' })
  }
  res.json({
    paypal_plan_id: PAYPAL_PLAN_MAPPING[product_id],
    product_id: product_id
  })
})

// 5. POST /api/v1/paypal/subscription-approved
router.post('/subscription-approved', (req, res) => {
  const { paypal_subscription_id, product_id } = req.body
  res.json({ payment_status: 'approved', fulfillment_status: 'pending' })
})

// 6. GET /api/v1/paypal/order-status?checkout_id=...
router.get('/order-status', (req, res) => {
  const { checkout_id } = req.query
  res.json({
    payment_status: 'completed',
    fulfillment_status: 'fulfilled',
    product_id: 'G001',
    product_type: 'consumable',
    gems_credited: 120,
    asset_granted: false
  })
})

export default router
