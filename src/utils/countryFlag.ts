import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import { hasFlag } from 'country-flag-icons'

countries.registerLocale(en)

/** Short names / API variants → ISO alpha-2 */
const ALIASES: Record<string, string> = {
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  usa: 'US',
  us: 'US',
  'united states of america': 'US',
  uae: 'AE',
  korea: 'KR',
  'south korea': 'KR',
  russia: 'RU',
  'russian federation': 'RU',
}

function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** ISO alpha-2 from API `country` name (not country_code). */
export function resolveCountryIso(countryName?: string | null): string | null {
  const name = (countryName ?? '').trim()
  if (!name || /^unknown$/i.test(name)) return null

  const norm = normalizeCountryName(name)
  const alias = ALIASES[norm]
  if (alias && hasFlag(alias)) return alias

  const fromLib = countries.getAlpha2Code(name, 'en')
  if (fromLib && hasFlag(fromLib)) return fromLib.toUpperCase()

  const names = countries.getNames('en')
  for (const [iso, label] of Object.entries(names)) {
    if (normalizeCountryName(label) === norm && hasFlag(iso)) return iso
  }

  return null
}

/** PNG fallback URL (flagcdn). */
export function countryFlagImageUrl(iso: string, width = 40): string {
  const w = Math.min(80, Math.max(20, width))
  return `https://flagcdn.com/w${w}/${iso.toLowerCase()}.png`
}
