import { useEffect, useRef } from 'react'
import { ENV_CONFIG } from '../../config/env'

/** Taller slot for home banner (large rectangle style). */
const AD_MIN_HEIGHT_PX = 280

/**
 * Google AdSense display unit. In development, `data-adtest="on"` requests test creatives
 * when your site + ad units are configured in AdSense.
 * Set VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT from your AdSense account.
 */
export default function AdSenseBanner() {
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const client = ENV_CONFIG.ADSENSE_CLIENT.trim()
  const slot = ENV_CONFIG.ADSENSE_SLOT?.trim()
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

  if (hasRealUnit) {
    return (
      <div
        className="mt-8 flex w-full justify-center sm:mt-10"
        role="complementary"
        aria-label="Advertisement"
      >
        <ins
          ref={insRef}
          className="adsbygoogle block w-full max-w-[728px]"
          style={{
            display: 'block',
            minWidth: '300px',
            width: '100%',
            minHeight: `${AD_MIN_HEIGHT_PX}px`,
          }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
          {...(isDev ? ({ 'data-adtest': 'on' } as const) : {})}
        />
      </div>
    )
  }

  /* No env: show a fixed-height test ad shell so layout matches production (no env instructions). */
  if (import.meta.env.PROD) {
    return <div className="mt-6 h-px sm:mt-8" aria-hidden />
  }

  return (
    <div
      className="mt-8 w-full sm:mt-10"
      role="complementary"
      aria-label="Test advertisement"
    >
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
        Advertisement
      </p>
      <div
        className="relative mx-auto flex w-full max-w-[728px] flex-col items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-black/20 shadow-inner"
        style={{ minHeight: `${AD_MIN_HEIGHT_PX}px` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 12px,
              rgba(255,255,255,0.4) 12px,
              rgba(255,255,255,0.4) 13px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 12px,
              rgba(255,255,255,0.35) 12px,
              rgba(255,255,255,0.35) 13px
            )`,
          }}
          aria-hidden
        />
        <div className="relative z-[1] flex flex-col items-center justify-center px-6 text-center">
          <span className="rounded-full border border-white/20 bg-ocean/80 px-4 py-1.5 text-xs font-semibold text-[#ffd66b] shadow-sm">
            Test advertisement
          </span>
        </div>
      </div>
    </div>
  )
}
