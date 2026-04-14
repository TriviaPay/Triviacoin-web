import { useEffect, useRef, useState } from 'react'
import { getPayPalClientId, getPayPalSubscriptionConfig, postPayPalSubscriptionApproved } from '../../services/payments'
import { paymentServiceNotFoundMessage } from '../../services/payments/errors'
import { loadPayPalSdk } from './loadPayPalSdk'

type Props = {
  productId: string
  accessToken: string | null
  disabled?: boolean
  onApproveSuccess: () => void
  onError: (message: string) => void
  onCancel: () => void
}

/**
 * PayPal Smart Buttons — subscription flow; uses `createSubscription` with a `plan_id`.
 */
export default function PayPalSubscriptionButtons({
  productId,
  accessToken,
  disabled,
  onApproveSuccess,
  onError,
  onCancel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const successRef = useRef(onApproveSuccess)
  const errRef = useRef(onError)
  const cancelRef = useRef(onCancel)
  successRef.current = onApproveSuccess
  errRef.current = onError
  cancelRef.current = onCancel

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const { client_id } = await getPayPalClientId()
        if (cancelled) return
        // For subscriptions, we must load the SDK with vault=true and intent=subscription (or just vault=true)
        await loadPayPalSdk(client_id, 'subscription')
        if (cancelled || !window.paypal || !containerRef.current) return
        containerRef.current.innerHTML = ''
        const buttons = window.paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'subscribe' },
          createSubscription: async (_data, actions) => {
            const t = accessToken?.trim()
            if (!t) throw new Error('Sign in required')
            const { paypal_plan_id } = await getPayPalSubscriptionConfig(productId, t)
            return actions.subscription.create({
              plan_id: paypal_plan_id,
            })
          },
          onApprove: async (data) => {
            const t = accessToken?.trim()
            if (!t) {
              errRef.current('Sign in required')
              return
            }
            const subId = data.subscriptionID
            if (!subId) {
              errRef.current('Missing PayPal subscription ID')
              return
            }
            try {
              await postPayPalSubscriptionApproved(subId, productId, t)
              successRef.current()
            } catch (e) {
              errRef.current(e instanceof Error ? e.message : 'Approval record failed')
            }
          },
          onCancel: () => cancelRef.current(),
          onError: (err) => errRef.current(err instanceof Error ? err.message : 'PayPal error'),
        })
        await buttons.render(containerRef.current)
        if (!cancelled) setSdkReady(true)
      } catch (e) {
        if (!cancelled) {
          const raw = e instanceof Error ? e.message : 'PayPal unavailable'
          setLoadErr(paymentServiceNotFoundMessage(raw))
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [productId, accessToken])

  if (loadErr) {
    return <p className="text-sm text-amber-200/90">{loadErr}</p>
  }

  if (!accessToken?.trim()) {
    return null // Handled by parent
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      {!sdkReady && !loadErr ? (
        <div className="flex items-center gap-2 py-3 text-sm text-white/70">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-[#ffd66b]" />
          Loading PayPal…
        </div>
      ) : null}
      <div ref={containerRef} className="min-h-[45px]" />
    </div>
  )
}
