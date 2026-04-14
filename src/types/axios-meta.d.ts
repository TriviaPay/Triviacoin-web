import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    meta?: {
      /** POST /bind-password — send Bearer + X-Device-UUID */
      bindWithDevice?: boolean
      /** Non-empty JWT from caller; `null` = force guest (`fetchWithAuth` sets via `_forceGuest`) */
      tokenOverride?: string | null
      /** Do not apply guest/Bearer rules; use only provided headers (refresh, dev login) */
      skipAuthHeaders?: boolean
      /** Internal: retry once after refresh */
      _retryAfterRefresh?: boolean
      /** Internal: request used Bearer (session JWT) */
      __hadBearer?: boolean
    }
  }
}
