import { useEffect, useRef } from 'react'
import { ENV_CONFIG } from '../../config/env'

const CARD_MIN_HEIGHT_PX = 320

/**
 * Home results row middle column: same footprint as former ChallengeFriendsCard.
 * Ad fills the card edge-to-edge. Slot: `VITE_ADSENSE_SLOT_SQUARE` or `VITE_ADSENSE_SLOT`.
 */
export default function AdSenseHomeGridCard() {
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const client = ENV_CONFIG.ADSENSE_CLIENT.trim()
  const slot = (ENV_CONFIG.ADSENSE_SLOT_SQUARE ?? ENV_CONFIG.ADSENSE_SLOT)?.trim()
  const hasRealUnit = Boolean(client && slot)
  const isDev = import.meta.env.DEV

  useEffect(() => {
    if (!hasRealUnit) return

    const pushAd = () => {
      if (pushedRef.current || !insRef.current) return
      try {
        const w = window as Window & { adsbygoogle?: unknown[] }
        w.adsbygoogle = w.adsbygoogle || []
        w.adsbygoogle.push({})
        pushedRef.current = true
      } catch {
        pushedRef.current = false
      }
    }

    const scriptId = 'adsbygoogle-loader'
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null

    if (existing) {
      if (existing.dataset.loaded === '1') pushAd()
      else existing.addEventListener('load', pushAd, { once: true })
      return
    }

    const s = document.createElement('script')
    s.id = scriptId
    s.async = true
    s.crossOrigin = 'anonymous'
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client!)}`
    s.onload = () => {
      s.dataset.loaded = '1'
      pushAd()
    }
    document.head.appendChild(s)
  }, [hasRealUnit, client, slot])

  const shell =
    'section-card relative flex w-full min-h-[320px] flex-col overflow-hidden rounded-3xl border border-[#e5d4b8] bg-cream bg-dots text-[#0b2a6c] shadow-[0_16px_32px_rgba(0,0,0,0.18)] p-0'

  if (hasRealUnit) {
    return (
      <section className={shell} aria-label="Advertisement">
        <span className="pointer-events-none absolute left-3 top-2 z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b2a6c]/35">
          Advertisement
        </span>
        <div className="flex min-h-[320px] flex-1 flex-col">
          <ins
            ref={insRef}
            className="adsbygoogle block h-full min-h-[320px] w-full max-w-full flex-1"
            style={{ display: 'block', minHeight: CARD_MIN_HEIGHT_PX }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="rectangle"
            data-full-width-responsive="true"
            {...(isDev ? ({ 'data-adtest': 'on' } as const) : {})}
          />
        </div>
      </section>
    )
  }

  if (import.meta.env.PROD) {
    return <section className={shell} aria-hidden />
  }

  return (
    <section className={shell} role="complementary" aria-label="Test advertisement">
      <span className="pointer-events-none absolute left-3 top-2 z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b2a6c]/35">
        Advertisement
      </span>
      <div
        className="relative flex min-h-[320px] w-full flex-1 flex-col items-center justify-center bg-[#f7f2e8]"
        style={{ minHeight: CARD_MIN_HEIGHT_PX }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 14px,
              rgba(11,42,108,0.22) 14px,
              rgba(11,42,108,0.22) 15px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 14px,
              rgba(11,42,108,0.16) 14px,
              rgba(11,42,108,0.16) 15px
            )`,
          }}
          aria-hidden
        />
        <span className="relative z-[1] px-5 text-center text-xs font-medium text-[#0b2a6c]/65">
          Ad placeholder · configure VITE_ADSENSE_SLOT or VITE_ADSENSE_SLOT_SQUARE
        </span>
      </div>
    </section>
  )
}
