import { API_CONFIG } from '../config/api'
import { api } from '../api/axiosInstance'
import { authService } from '../services/authService'
import { getStore } from './storeRef'

type RefreshBody = Record<string, string>

function parseTokenResponse(raw: unknown): { access?: string; refresh?: string } {
  const r = raw as Record<string, unknown>
  const data = (r?.data ?? r) as Record<string, unknown>
  const access =
    (typeof data.sessionJwt === 'string' ? data.sessionJwt : undefined) ??
    (typeof data.session_jwt === 'string' ? data.session_jwt : undefined) ??
    (typeof data.access_token === 'string' ? data.access_token : undefined) ??
    (typeof data.accessToken === 'string' ? data.accessToken : undefined) ??
    (typeof data.token === 'string' ? data.token : undefined)
  const refresh =
    (typeof data.refreshJwt === 'string' ? data.refreshJwt : undefined) ??
    (typeof data.refresh_jwt === 'string' ? data.refresh_jwt : undefined) ??
    (typeof data.refresh_token === 'string' ? data.refresh_token : undefined)
  return { access, refresh }
}

async function requestRefresh(refreshJwt: string): Promise<{ access?: string; refresh?: string } | null> {
  const path = API_CONFIG.ENDPOINTS.AUTH.REFRESH
  const bodies: RefreshBody[] = [
    { refresh_jwt: refreshJwt },
    { refreshJwt: refreshJwt },
    { refresh_token: refreshJwt },
    { refreshToken: refreshJwt },
  ]

  for (const body of bodies) {
    try {
      const res = await api.post(path, body, {
        meta: { skipAuthHeaders: true },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      })
      if (res.status < 200 || res.status >= 300) continue
      const out = parseTokenResponse(res.data)
      if (out.access) return out
    } catch {
      continue
    }
  }

  try {
    const res = await api.post(path, undefined, {
      meta: { skipAuthHeaders: true },
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${refreshJwt}`,
      },
    })
    if (res.status < 200 || res.status >= 300) return null
    const out = parseTokenResponse(res.data)
    return out.access ? out : null
  } catch {
    return null
  }
}

let refreshPromise: Promise<boolean> | null = null

/**
 * Uses stored Descope refresh JWT against POST /auth/refresh.
 * Single-flight: concurrent 401s share one refresh.
 * On success: updates localStorage + Redux `auth.token`.
 */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const rt = authService.getRefreshToken()
      if (!rt) return false

      const tokens = await requestRefresh(rt)
      if (!tokens?.access) return false

      authService.setSessionToken(tokens.access)
      if (tokens.refresh) authService.setRefreshToken(tokens.refresh)

      const store = getStore()
      if (store) {
        const { sessionTokenRefreshed } = await import('../store/authSlice')
        store.dispatch(sessionTokenRefreshed(tokens.access))
      }
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
