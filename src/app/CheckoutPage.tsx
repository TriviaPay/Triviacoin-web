import { useCallback, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { navigate } from '../store/uiSlice'
import { clearCheckout } from '../store/checkoutSlice'
import {
  createStripeCheckoutSession,
  PaymentApiError,
} from '../services/payments'
import PayPalOneTimeButtons from '../components/payments/PayPalOneTimeButtons'
import PayPalSubscriptionButtons from '../components/payments/PayPalSubscriptionButtons'
import type { Page } from '../store/uiSlice'

/**
 * Hosted Stripe Checkout + PayPal Smart Buttons. Pricing and capture are server-side only.
 */
export default function CheckoutPage() {
  const dispatch = useAppDispatch()
  const draft = useAppSelector((s) => s.checkout.draft)
  const token = useAppSelector((s) => s.auth.token)

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [stripeBusy, setStripeBusy] = useState(false)
  const [paypalMsg, setPaypalMsg] = useState<string | null>(null)

  const isSub = draft?.paymentRoute === 'subscription'
  const hasToken = Boolean(token?.trim())
  const backPage: Page = draft?.cancelReturnPage ?? 'shop'

  const leaveCheckout = useCallback(() => {
    dispatch(clearCheckout())
    dispatch(navigate(backPage))
  }, [dispatch, backPage])

  const payStripe = useCallback(async () => {
    if (!draft) return
    if (!hasToken) {
      setCheckoutError('Please sign in to pay with Stripe.')
      return
    }
    setStripeBusy(true)
    setCheckoutError(null)
    setPaypalMsg(null)
    try {
      const res = await createStripeCheckoutSession(draft.productId, token ?? null)
      window.location.href = res.checkout_url
    } catch (e) {
      const msg =
        e instanceof PaymentApiError ? e.message : e instanceof Error ? e.message : 'Could not start checkout'
      setCheckoutError(msg)
      setStripeBusy(false)
    }
  }, [draft, hasToken, token])


  if (!draft) {
    return (
      <section className="section-card rounded-3xl bg-quiz-panel text-white">
        <p className="text-sm text-white/80">No item selected. Go back to the shop or wallet.</p>
        <button type="button" onClick={leaveCheckout} className="mt-4 text-sm text-[#93c5fd] underline">
          Back
        </button>
      </section>
    )
  }

  return (
    <section className="section-card !overflow-visible rounded-3xl bg-quiz-panel text-white">
      <div className="mx-auto max-w-xl space-y-6 sm:space-y-8">
        {/* Selection Highlight Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          {/* Decorative background glow */}
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#ffd66b]/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              {draft.iconUrl ? (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-3 shadow-xl ring-1 ring-white/10">
                  <img src={draft.iconUrl} alt="" className="h-full w-full object-contain drop-shadow-glow" />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl">
                  🎁
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd66b]">Your Selection</p>
                <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {draft.label}
                </h2>
                {draft.price != null && (
                  <p className="font-display text-xl font-bold text-white/90">
                    {typeof draft.price === 'number' ? `$${draft.price.toFixed(2)}` : draft.price}
                  </p>
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={leaveCheckout}
              className="group flex items-center gap-2 self-start rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95 sm:self-auto"
            >
              <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {!hasToken ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Sign in is required for card and PayPal checkout.
          </div>
        ) : null}

        {paypalMsg ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {paypalMsg}
          </div>
        ) : null}

        {isSub ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm leading-relaxed text-white/70 sm:px-4">
            <p>
              <span className="font-medium text-white/85">Trivia Challenge — monthly subscription.</span> This charge unlocks
              your selected tier each billing period. It does <span className="text-white/90">not</span> add gems.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                className="font-semibold text-[#93c5fd] underline underline-offset-2"
                onClick={() => {
                  dispatch(clearCheckout())
                  dispatch(navigate('shop'))
                }}
              >
                Shop (gems & avatars)
              </button>
              <span className="text-white/35">·</span>
              <button
                type="button"
                className="font-semibold text-[#93c5fd] underline underline-offset-2"
                onClick={() => {
                  dispatch(clearCheckout())
                  dispatch(navigate('wallet'))
                }}
              >
                Wallet
              </button>
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm leading-relaxed text-white/70 sm:px-4">
            <p>One-time purchase.</p>
            <button
              type="button"
              className="mt-2 font-semibold text-[#93c5fd] underline underline-offset-2"
              onClick={() => {
                dispatch(clearCheckout())
                dispatch(navigate('daily'))
              }}
            >
              Go to Trivia Challenge
            </button>
          </div>
        )}

        {isSub ? (
          <div className="space-y-6">
            {checkoutError ? (
              <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {checkoutError}
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Stripe</h3>
              <p className="mt-2 text-sm text-white/70">Secure hosted Checkout — subscriptions supported.</p>
              <button
                type="button"
                disabled={stripeBusy || !hasToken}
                onClick={() => void payStripe()}
                className="mt-4 w-full rounded-xl bg-[#635bff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5349e0] disabled:opacity-50"
              >
                {stripeBusy ? 'Redirecting…' : 'Continue with Stripe'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">PayPal</h3>
              <p className="mt-2 text-sm text-white/70">
                Approve your subscription using the PayPal button below.
              </p>
              <div className="mt-4">
                <PayPalSubscriptionButtons
                  productId={draft.productId}
                  accessToken={token ?? null}
                  disabled={!hasToken}
                  onApproveSuccess={() => {
                    setCheckoutError(null)
                    setPaypalMsg('Subscription approved! It will be activated shortly.')
                  }}
                  onError={(m) => setCheckoutError(m)}
                  onCancel={() => setPaypalMsg('PayPal subscription was cancelled.')}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {checkoutError ? (
              <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {checkoutError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Stripe</h3>
              <p className="mt-2 text-sm text-white/70">You will complete payment on Stripe&apos;s secure page.</p>
              <button
                type="button"
                disabled={stripeBusy || !hasToken}
                onClick={() => void payStripe()}
                className="mt-4 w-full rounded-xl bg-[#635bff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5349e0] disabled:opacity-50"
              >
                {stripeBusy ? 'Redirecting…' : 'Pay with Stripe'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">PayPal</h3>
              <p className="mt-2 text-sm text-white/70">Pay with PayPal (balance or linked card).</p>
              <div className="mt-4">
                <PayPalOneTimeButtons
                  productId={draft.productId}
                  accessToken={token ?? null}
                  disabled={!hasToken}
                  onCaptureSuccess={(gems) => {
                    setCheckoutError(null)
                    setPaypalMsg(
                      gems > 0 ? `${gems} gems credited (per server).` : 'Purchase recorded.',
                    )
                  }}
                  onError={(m) => setCheckoutError(m)}
                  onCancel={() => setPaypalMsg('PayPal payment was cancelled.')}
                />
              </div>
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-white/45">
          Test mode: use Stripe test card 4242 4242 4242 4242 or a PayPal sandbox buyer account.
        </p>
      </div>
    </section>
  )
}
