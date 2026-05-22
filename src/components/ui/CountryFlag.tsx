import type { CSSProperties, ComponentType, SVGProps } from 'react'
import { useMemo } from 'react'
import { hasFlag } from 'country-flag-icons'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import { countryFlagImageUrl, resolveCountryIso } from '../../utils/countryFlag'

type Props = {
  /** API field `country` (e.g. "Egypt", "United Kingdom") */
  country?: string | null
  size?: number
  className?: string
  title?: string
}

type FlagSvg = ComponentType<SVGProps<SVGSVGElement>>

const flagComponents = FlagIcons as Record<string, FlagSvg | undefined>

/** Standard 3×2 flag from country name (not circular). */
export default function CountryFlag({ country, size = 28, className = '', title }: Props) {
  const iso = resolveCountryIso(country)
  const label = title ?? (country && !/^unknown$/i.test(country) ? country : 'Country')
  const flagH = Math.round(size)
  const flagW = Math.round(flagH * 1.5)

  const SvgFlag = useMemo(() => {
    if (!iso || !hasFlag(iso)) return null
    return flagComponents[iso] ?? null
  }, [iso])

  if (!iso) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-sm border border-white/15 bg-white/10 text-sm ${className}`}
        style={{ width: flagW, height: flagH }}
        title={label}
        aria-label={label}
      >
        <span aria-hidden>🌐</span>
      </div>
    )
  }

  if (SvgFlag) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-sm border border-white/20 shadow-sm ${className}`}
        style={{ width: flagW, height: flagH }}
        title={label}
        aria-label={label}
      >
        <SvgFlag
          aria-hidden
          style={{ width: '100%', height: '100%', display: 'block' } as CSSProperties}
        />
      </div>
    )
  }

  return (
    <img
      src={countryFlagImageUrl(iso, flagH)}
      alt=""
      width={flagW}
      height={flagH}
      className={`shrink-0 rounded-sm border border-white/20 object-cover shadow-sm ${className}`}
      style={{ width: flagW, height: flagH }}
      title={label}
      loading="lazy"
      decoding="async"
    />
  )
}
