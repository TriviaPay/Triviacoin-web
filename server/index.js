import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import stripeRoutes from './routes/stripeRoutes.js'
import paypalRoutes from './routes/paypalRoutes.js'
import { stripeWebhookHandler } from './webhooks/stripeWebhookHandler.js'

const app = express()
const PORT = parseInt(process.env.PORT || '4242', 10)

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim())
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin) || process.env.CLIENT_ORIGIN === '*') {
        callback(null, true)
      } else {
        console.warn(`[CORS] Origin ${origin} not allowed. Allowed:`, allowedOrigins)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }),
)

/** Webhook must receive raw body for signature verification. */
app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler,
)

app.use(express.json())
app.use('/api/v1/stripe', stripeRoutes)
app.use('/api/v1/paypal', paypalRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Payment API listening on http://localhost:${PORT}`)
  console.log(`Webhook URL (Stripe CLI): http://localhost:${PORT}/api/v1/stripe/webhook`)
})

// Error logging middleware
app.use((err, req, res, next) => {
  console.error('[Global Error]', err)
  
  // Ensure CORS headers are present even on errors
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})
