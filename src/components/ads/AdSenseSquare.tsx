import { useEffect, useRef } from 'react'
import { ENV_CONFIG } from '../../config/env'

/**
 * Responsive display area for the home quiz sidebar — matches quiz column width.
 * Set `VITE_ADSENSE_SLOT_SQUARE` for a dedicated unit, or it reuses `VITE_ADSENSE_SLOT`.
 */
export default function AdSenseSquare() {
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

  const shellCls =
    'w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'

  if (hasRealUnit) {
    return (
      <div className="mt-5 flex w-full shrink-0 flex-col" role="complementary" aria-label="Advertisement">
        <div className={`${shellCls} min-h-[250px] w-full`}>
          <ins
            ref={insRef}
            className="adsbygoogle block min-h-[250px] w-full"
            style={{ display: 'block' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
            {...(isDev ? ({ 'data-adtest': 'on' } as const) : {})}
          />
        </div>
      </div>
    )
  }

  if (import.meta.env.PROD) {
    return <div className="mt-5 h-px shrink-0" aria-hidden />
  }

  return (
    <div className="mt-5 flex w-full shrink-0 flex-col" role="complementary" aria-label="Test advertisement">
      <div
        className={`${shellCls} relative flex min-h-[250px] w-full flex-col items-center justify-center`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 14px,
              rgba(255,255,255,0.35) 14px,
              rgba(255,255,255,0.35) 15px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 14px,
              rgba(255,255,255,0.3) 14px,
              rgba(255,255,255,0.3) 15px
            )`,
          }}
          aria-hidden
        />
        <span className="relative z-[1] rounded-full border border-white/25 bg-[#0a3b89]/90 px-4 py-1.5 text-xs font-semibold text-[#ffd66b]">
          Square ad · set VITE_ADSENSE_SLOT_SQUARE
        </span>
      </div>
    </div>
  )
}
