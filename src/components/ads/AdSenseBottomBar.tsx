import { useEffect, useRef } from 'react'
import { ENV_CONFIG } from '../../config/env'

const BAR_MIN_HEIGHT = 72

/**
 * Fixed bottom AdSense strip shown on every route. Uses `VITE_ADSENSE_SLOT_BOTTOM` or falls back to `VITE_ADSENSE_SLOT`.
 * Web uses AdSense (not the Android APPLICATION_ID). Test creatives: `data-adtest="on"` in dev when a real unit is configured.
 */
export default function AdSenseBottomBar() {
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const client = ENV_CONFIG.ADSENSE_CLIENT.trim()
  const slot = (ENV_CONFIG.ADSENSE_SLOT_BOTTOM || ENV_CONFIG.ADSENSE_SLOT || '').trim()
  const hasRealUnit = Boolean(slot)
  const isDev = import.meta.env.DEV

  useEffect(() => {
    if (import.meta.env.PROD || hasRealUnit) return
    console.info(
      `[Ads] Publisher ${client} is set in code. Create a Display ad unit in AdSense (Ads → By ad unit) and add ` +
        '`VITE_ADSENSE_SLOT` (and optionally `VITE_ADSENSE_SLOT_BOTTOM`) to .env.local with the ad unit’s **data-ad-slot** id. ' +
        'Without a slot, no `<ins>` ad can load. Localhost may stay blank until the site is approved in AdSense.'
    )
  }, [hasRealUnit, client])

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
  }, [hasRealUnit, client])

  if (hasRealUnit) {
    return (
      <div
        className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[40] flex justify-center border-t border-white/10 bg-midnight/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md"
        role="complementary"
        aria-label="Advertisement"
      >
        <ins
          ref={insRef}
          className="adsbygoogle block w-full max-w-screen-lg"
          style={{
            display: 'block',
            minHeight: `${BAR_MIN_HEIGHT}px`,
            width: '100%',
          }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
          {...(isDev ? ({ 'data-adtest': 'on' } as const) : {})}
        />
      </div>
    )
  }

  if (import.meta.env.PROD) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-[40] h-[env(safe-area-inset-bottom)] bg-transparent"
        aria-hidden
      />
    )
  }

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[40] flex justify-center border-t border-white/10 bg-black/80 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-sm"
      role="complementary"
      aria-label="Test advertisement"
    >
      <div
        className="flex w-full max-w-screen-lg items-center justify-center rounded-t-lg border border-white/10 bg-white/[0.06]"
        style={{ minHeight: `${BAR_MIN_HEIGHT}px` }}
      >
        <span className="max-w-[min(100%,28rem)] px-2 text-center text-[10px] font-medium leading-snug text-white/45">
          Placeholder — add VITE_ADSENSE_SLOT from AdSense (Display unit code); publisher is already configured
        </span>
      </div>
    </div>
  )
}
