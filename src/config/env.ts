/**
 * Environment Variable Management
 * Centralized environment variable handling with validation
 * All secrets should be loaded from environment variables
 * Web: uses Vite import.meta.env with VITE_ prefix
 */

const __DEV__ = import.meta.env.MODE !== 'production'

export interface EnvConfig {
  DESCOPE_PROJECT_ID: string
  ONESIGNAL_APP_ID: string
  PUSHER_KEY: string
  PUSHER_CLUSTER: string
  API_BASE_URL: string
  AUTH_BASE_URL?: string
  API_TIMEOUT: number
  SENTRY_DSN?: string
  ENVIRONMENT: string
  isDevelopment: boolean
  DEV_SIGNIN_SECRET?: string
  /** Google AdSense publisher ID (`ca-pub-…`). Defaults to this app’s AdSense account; override with `VITE_ADSENSE_CLIENT`. */
  ADSENSE_CLIENT: string
  /** Ad unit slot ID for display banner (optional) */
  ADSENSE_SLOT?: string
  /** Optional separate slot for fixed bottom bar; falls back to ADSENSE_SLOT */
  ADSENSE_SLOT_BOTTOM?: string
  /** Optional square / sidebar unit (home quiz column); falls back to ADSENSE_SLOT */
  ADSENSE_SLOT_SQUARE?: string
  /**
   * When true: free-mode GETs that return 401 use placeholder JSON (JWT-only server).
   * In development, defaults to on unless `VITE_USE_GUEST_STUB_ON_401=false`. Production: only if `=true`.
   */
  useGuestStubOn401: boolean
}

/** Trivia Coin AdSense publisher (Account → Account information). Use ca-pub-… in ad tags. */
const DEFAULT_ADSENSE_CLIENT_ID = 'ca-pub-5401723405838202'

/**
 * AdSense shows `pub-…` in the UI; display tags require `ca-pub-…`.
 */
export function normalizeAdsenseClientId(raw: string): string {
  const t = raw.trim()
  if (!t) return DEFAULT_ADSENSE_CLIENT_ID
  if (t.startsWith('ca-pub-')) return t
  if (/^pub-\d+$/i.test(t)) return `ca-${t}`
  if (/^ca-/i.test(t)) return t
  return DEFAULT_ADSENSE_CLIENT_ID
}

/**
 * Get environment variable with fallback
 * Vite exposes env vars as import.meta.env.VITE_* in client
 */
function getEnvVar(key: string, fallback?: string): string {
  const value =
    (import.meta.env[`VITE_${key}` as keyof ImportMetaEnv] as string | undefined) ||
    (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ||
    fallback
  return value ?? fallback ?? ''
}

/**
 * Validate environment variables (production only)
 */
function validateEnvVars(): void {
  if (__DEV__) return

  const missing: string[] = []
  const required = ['DESCOPE_PROJECT_ID', 'ONESIGNAL_APP_ID', 'PUSHER_KEY', 'PUSHER_CLUSTER'] as const

  for (const key of required) {
    const value = getEnvVar(key)
    if (!value || value.trim() === '') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    console.error(`[ENV] Missing required variables: ${missing.join(', ')}`)
    console.error('[ENV] Set VITE_* variables in .env or build config.')
  }
}

/**
 * Environment configuration
 * In development, provides fallback values if env vars are not set
 * In production, required values should come from VITE_* env vars
 */
export const ENV_CONFIG: EnvConfig = {
  DESCOPE_PROJECT_ID: getEnvVar('DESCOPE_PROJECT_ID', 'P2yoVmehdHRYCZPehBOpMd97WMsH'),
  ONESIGNAL_APP_ID: getEnvVar('ONESIGNAL_APP_ID', 'e32aadbf-07ed-46a8-9635-f47d608afc54'),
  PUSHER_KEY: getEnvVar('PUSHER_KEY', 'd2a89d9fcfd559674245'),
  PUSHER_CLUSTER: getEnvVar('PUSHER_CLUSTER', 'mt1'),
  API_BASE_URL: getEnvVar('API_BASE_URL', 'https://trivia-back-end.vercel.app'),
  AUTH_BASE_URL: getEnvVar('AUTH_BASE_URL', '') || undefined,
  API_TIMEOUT: parseInt(getEnvVar('API_TIMEOUT', '10000'), 10),
  SENTRY_DSN: getEnvVar('SENTRY_DSN', ''),
  ENVIRONMENT: getEnvVar('NODE_ENV', __DEV__ ? 'development' : 'production'),
  isDevelopment: __DEV__,
  DEV_SIGNIN_SECRET: getEnvVar('DEV_SIGNIN_SECRET', 'TriviaPay'),
  ADSENSE_CLIENT: normalizeAdsenseClientId(
    getEnvVar('ADSENSE_CLIENT', DEFAULT_ADSENSE_CLIENT_ID),
  ),
  ADSENSE_SLOT: getEnvVar('ADSENSE_SLOT', '') || undefined,
  ADSENSE_SLOT_BOTTOM: getEnvVar('ADSENSE_SLOT_BOTTOM', '') || undefined,
  ADSENSE_SLOT_SQUARE: getEnvVar('ADSENSE_SLOT_SQUARE', '') || undefined,
  useGuestStubOn401:
    import.meta.env.VITE_USE_GUEST_STUB_ON_401 === 'true' ||
    (__DEV__ && import.meta.env.VITE_USE_GUEST_STUB_ON_401 !== 'false'),
}

export const env = ENV_CONFIG

try {
  validateEnvVars()
} catch (error) {
  if (error instanceof Error) {
    console.error('[ENV] Validation failed:', error.message)
  }
}

export default ENV_CONFIG

