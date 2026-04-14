import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../store/store'
import { getStripeSessionStatus, PaymentApiError, type StripeSessionStatusResponse } from '../services/payments'

const POLL_MS = 2000
const POLL_MAX = 15

/**
 * After Stripe redirect: never trust URL alone — verify via GET /stripe/session-status.
 */
export default function CheckoutSuccessPage() {
  const token = useAppSelector((s) => s.auth.token)
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  const [status, setStatus] = useState<StripeSessionStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)

  const fetchOnce = useCallback(async () => {
    if (!sessionId || !token?.trim()) return null
    try {
      return await getStripeSessionStatus(sessionId, token)
    } catch (e) {
      if (e instanceof PaymentApiError) throw e
      throw new PaymentApiError(e instanceof Error ? e.message : 'Status failed', 500)
    }
  }, [sessionId, token])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('Missing session_id in URL.')
      return
    }
    if (!token?.trim()) {
      setLoading(false)
      setError('Sign in to verify this payment with the server.')
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const r = await fetchOnce()
        if (cancelled || !r) return
        setStatus(r)
        setError(null)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof PaymentApiError ? e.message : e instanceof Error ? e.message : 'Status check failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [sessionId, token, fetchOnce])

  useEffect(() => {
    if (!sessionId || !token?.trim()) return
    if (!status) return
    const paid = status.payment_status === 'paid'
    const fulfilled = status.fulfillment_status === 'fulfilled'
    if (!paid || fulfilled) return
    if (pollCount >= POLL_MAX) return

    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const r = await fetchOnce()
          if (r) {
            setStatus(r)
            setPollCount((c) => c + 1)
          }
        } catch {
          /* keep last status */
        }
      })()
    }, POLL_MS)

    return () => window.clearTimeout(t)
  }, [status, sessionId, token, pollCount, fetchOnce])

  const isSubscription = Boolean(
    status &&
      (/^SUB/i.test(status.product_id) ||
        String(status.product_type ?? '')
          .toLowerCase()
          .includes('subscr')),
  )

  const headline = (() => {
    if (!sessionId) return 'Payment'
    if (loading && !status) return 'Payment'
    if (error && !status) return 'Payment'
    if (!status) return 'Payment'
    if (status.payment_status !== 'paid') return 'Pending'
    if (status.fulfillment_status === 'fulfilled') return isSubscription ? 'Subscription active' : 'Payment successful'
    return 'Processing…'
  })()

  const retry = () => {
    setLoading(true)
    setError(null)
    setPollCount(0)
    void fetchOnce()
      .then((r) => {
        if (r) setStatus(r)
      })
      .catch((e) =>
        setError(
          e instanceof PaymentApiError ? e.message : e instanceof Error ? e.message : 'Retry failed',
        ),
      )
      .finally(() => setLoading(false))
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628] px-4 py-24 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="font-display text-2xl font-bold text-[#ffd66b]">{headline}</h1>

        {!sessionId ? (
          <p className="mt-4 text-sm text-white/75">No checkout session in this link.</p>
        ) : !token?.trim() ? (
          <p className="mt-4 text-sm text-white/75">Sign in to load payment status.</p>
        ) : loading && !status ? (
          <>
            <p className="mt-4 text-sm text-white/75">Checking payment with the server…</p>
            <div className="mt-6 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-[#ffd66b]" />
            </div>
          </>
        ) : error ? (
          <>
            <p className="mt-4 text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => retry()}
              className="mt-6 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              Retry
            </button>
          </>
        ) : status?.payment_status === 'paid' && status.fulfillment_status === 'fulfilled' ? (
          <div className="mt-4 space-y-2 text-sm text-emerald-200">
            <p>{isSubscription ? 'Your subscription is active.' : 'Payment successful and fulfillment completed.'}</p>
            {status.gems_credited > 0 ? <p className="tabular-nums">{status.gems_credited} gems credited.</p> : null}
            {status.completed_at ? <p className="text-white/50">Completed {status.completed_at}</p> : null}
          </div>
        ) : status?.payment_status === 'paid' ? (
          <>
            <p className="mt-4 text-sm text-amber-200">
              Payment received — fulfillment is still processing. This page updates automatically; webhook is the source of
              truth.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-[#ffd66b]" />
            </div>
            <button
              type="button"
              onClick={() => retry()}
              className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Refresh status
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-amber-200">
            Payment not completed yet. If you left Checkout early, return to the shop and try again.
          </p>
        )}

        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-[#93c5fd] underline">
          Back to app
        </Link>
      </div>
    </div>
  )
}
