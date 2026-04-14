import { useEffect, useRef, useState } from 'react'
import { capturePayPalOrder, createPayPalOrder, getPayPalClientId } from '../../services/payments'
import { paymentServiceNotFoundMessage } from '../../services/payments/errors'
import { loadPayPalSdk } from './loadPayPalSdk'

type Props = {
  productId: string
  accessToken: string | null
  disabled?: boolean
  onCaptureSuccess: (gems: number) => void
  onError: (message: string) => void
  onCancel: () => void
}

/**
 * PayPal Smart Buttons — one-time capture flow; server creates & captures order.
 */
export default function PayPalOneTimeButtons({
  productId,
  accessToken,
  disabled,
  onCaptureSuccess,
  onError,
  onCancel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const successRef = useRef(onCaptureSuccess)
  const errRef = useRef(onError)
  const cancelRef = useRef(onCancel)
  successRef.current = onCaptureSuccess
  errRef.current = onError
  cancelRef.current = onCancel

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const { client_id } = await getPayPalClientId()
        if (cancelled) return
        await loadPayPalSdk(client_id, 'order')
        if (cancelled || !window.paypal || !containerRef.current) return
        containerRef.current.innerHTML = ''
        const buttons = window.paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            const t = accessToken?.trim()
            if (!t) throw new Error('Sign in required')
            return createPayPalOrder(productId, t)
          },
          onApprove: async (data) => {
            const t = accessToken?.trim()
            if (!t) {
              errRef.current('Sign in required')
              return
            }
            const id = data.orderID
            if (!id) {
              errRef.current('Missing PayPal order')
              return
            }
            try {
              const cap = await capturePayPalOrder(id, t)
              if (cap.fulfillment_status === 'fulfilled') {
                successRef.current(cap.gems_credited)
              } else {
                errRef.current('Payment captured but fulfillment is still pending.')
              }
            } catch (e) {
              errRef.current(e instanceof Error ? e.message : 'Capture failed')
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
    return <p className="text-sm text-white/60">Sign in to use PayPal.</p>
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
