/**
 * API Service - Backend API calls for auth, countries, etc.
 * Uses ENV_CONFIG.API_BASE_URL (trivia-back-end.vercel.app)
 */
import { API_CONFIG } from '../config/api'
import { ENV_CONFIG } from '../config/env'
import { api, fetchWithAuth, hasNonEmptySessionInStorage } from '../api/axiosInstance'
import { postGuestAdBonus, type GuestAdBonusResult } from '../lib/triviaApi'

const BASE_URL = API_CONFIG.BASE_URL
const AUTH_BASE_URL = ENV_CONFIG.AUTH_BASE_URL || BASE_URL

/** Deployments differ: unversioned vs /api/v1 — try alternates when the server returns 404. */
const DAILY_LOGIN_PATHS = [
  API_CONFIG.ENDPOINTS.TRIVIA.DAILY_LOGIN,
  '/api/v1/daily-login',
  '/trivia/daily-login',
  '/api/v1/trivia/daily-login',
] as const

export async function backendLogin(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: { id: string; email: string; username: string }; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'TriviaPay-Web/1.0',
    'X-App-Platform': 'web',
  }
  if (ENV_CONFIG.DEV_SIGNIN_SECRET) {
    headers['X-Dev-Secret'] = ENV_CONFIG.DEV_SIGNIN_SECRET
  }

  const extractError = (data: Record<string, unknown>): string => {
    if (data.errorDescription && typeof data.errorDescription === 'string') return data.errorDescription
    if (data.errorCode && typeof data.errorCode === 'string') {
      const code = data.errorCode
      if (code === 'E062903') return 'Invalid email or password'
      if (code === 'E062901') return 'Invalid credentials'
    }
    let msg = (data.detail ?? data.message ?? data.msg ?? data.error ?? 'Login failed') as string
    if (Array.isArray(msg)) msg = (msg as any)[0]?.msg || (msg as any)[0]?.loc?.join?.(' ') || String(msg)
    if (typeof msg === 'object' && msg !== null) msg = (msg as any)?.message || JSON.stringify(msg)
    return String(msg)
  }

  // Mobile-style: { email, password }, X-Dev-Secret for /dev/sign-in
  const payloadEmail = { email: normalizedEmail, password }
  const payloadLoginId = { loginId: normalizedEmail, password }
  const endpoints: { path: string; payload: Record<string, string> }[] = [
    { path: API_CONFIG.ENDPOINTS.LOGIN, payload: payloadEmail },
    { path: API_CONFIG.ENDPOINTS.LOGIN_ALT, payload: payloadEmail },
    { path: API_CONFIG.ENDPOINTS.LOGIN_DEV, payload: payloadEmail },
    { path: API_CONFIG.ENDPOINTS.LOGIN_FALLBACK, payload: payloadLoginId },
    { path: API_CONFIG.ENDPOINTS.LOGIN_V1, payload: payloadEmail },
  ]

  for (const { path, payload } of endpoints) {
    try {
      const res = await api.post(path, payload, {
        baseURL: AUTH_BASE_URL,
        meta: { skipAuthHeaders: true },
        headers,
      })
      const raw = (res.data && typeof res.data === 'object' ? res.data : {}) as Record<string, unknown>
      const fullRaw = raw as Record<string, unknown>
      const data = (fullRaw?.data ?? fullRaw) as Record<string, unknown>
      if (res.status < 200 || res.status >= 300) {
        const errStr = extractError(fullRaw)
        if (errStr.toLowerCase().includes('not available') || errStr.toLowerCase().includes('this environment')) {
          continue
        }
        if (res.status === 404) continue
        return { success: false, error: errStr }
      }
      const token = (data?.access_token ??
        data?.sessionJwt ??
        data?.session_token ??
        data?.token ??
        data?.jwt ??
        fullRaw?.access_token ??
        fullRaw?.sessionJwt ??
        fullRaw?.token ??
        fullRaw?.jwt) as string | undefined
      const userData = (data?.user ?? fullRaw?.user ?? data) as Record<string, unknown> | undefined
      const user = userData
        ? {
          id: String(userData.id ?? userData.user_id ?? userData.account_id ?? normalizedEmail),
          email: String(userData.email ?? normalizedEmail),
          username: String(userData.username ?? userData.name ?? ''),
        }
        : {
          id: normalizedEmail,
          email: normalizedEmail,
          username: '',
        }
      if (!token) return { success: false, error: 'No token in response' }
      return { success: true, token, user }
    } catch (e) {
      continue
    }
  }
  return { success: false, error: 'Invalid email or password' }
}
const TIMEOUT = ENV_CONFIG.API_TIMEOUT

export const apiService = {
  async checkEmailAvailability(email: string): Promise<{ success: boolean; data?: { available: boolean }; error?: string }> {
    try {
      const res = await api.get(
        `${API_CONFIG.ENDPOINTS.AUTH.CHECK_EMAIL}?email=${encodeURIComponent(email)}`,
      )
      const data = (res.data && typeof res.data === 'object' ? res.data : {}) as Record<string, unknown>
      if (res.status < 200 || res.status >= 300) throw new Error(String(data.message ?? data.detail ?? 'Check failed'))
      // available: true = email free, can signup | available: false = email exists, ask to sign in
      const available = data.available !== false
      return { success: true, data: { available } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Check failed' }
    }
  },

  async checkUsernameAvailability(
    username: string,
    token?: string | null
  ): Promise<{ success: boolean; data?: { available: boolean }; error?: string }> {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHECK_USERNAME}?username=${encodeURIComponent(username)}`,
        { method: 'GET', token }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.detail || 'Check failed')
      return { success: true, data: { available: data.available ?? true } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Check failed' }
    }
  },

  async validateReferralCode(code: string): Promise<{ success: boolean; data?: { valid: boolean }; error?: string }> {
    try {
      const res = await api.post(API_CONFIG.ENDPOINTS.VALIDATE_REFERRAL, { referral_code: code })
      const data = (res.data && typeof res.data === 'object' ? res.data : {}) as Record<string, unknown>
      if (res.status < 200 || res.status >= 300) throw new Error(String(data.message ?? data.detail ?? 'Validation failed'))
      return { success: true, data: { valid: data.valid === true } }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Validation failed' }
    }
  },

  async bindPassword(params: {
    email: string
    password: string
    username: string
    country: string
    dateOfBirth: string
    referral_code?: string | null
    descope_user_id?: string
  }, token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const body: Record<string, unknown> = {
        email: params.email,
        password: params.password,
        username: params.username.trim(),
        country: params.country,
        date_of_birth: params.dateOfBirth,
        referral_code: params.referral_code ?? null,
      }
      if (params.descope_user_id) body.descope_user_id = params.descope_user_id
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.BIND_PASSWORD}`, {
        method: 'POST',
        body: JSON.stringify(body),
        token,
        _bindWithDevice: true,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.detail || 'Bind password failed')
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Bind password failed' }
    }
  },

  async fetchProfileSummary(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoints = [
        API_CONFIG.ENDPOINTS.PROFILE_COMPLETE,
        API_CONFIG.ENDPOINTS.PROFILE,
        API_CONFIG.ENDPOINTS.PROFILE_SUMMARY,
      ]
      for (const path of endpoints) {
        try {
          const res = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'GET', token })
          const raw = await res.json()
          const data = raw?.data ?? raw
          if (!res.ok) {
            if (res.status === 404) continue
            throw new Error(raw?.message || raw?.detail || 'Failed to load profile')
          }
          return { success: true, data: data ?? raw }
        } catch {
          continue
        }
      }
      throw new Error('Failed to load profile')
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load profile' }
    }
  },

  async sendReferral(token: string): Promise<{
    success: boolean
    data?: { referral_code: string; share_text: string; app_link: string }
    error?: string
  }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/profile/send-referral`, {
        method: 'POST',
        token,
      })
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Failed to fetch referral data')
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch referral data' }
    }
  },

  async updateProfile(
    token: string,
    data: {
      first_name?: string
      last_name?: string
      gender?: string
      date_of_birth?: string
      street_1?: string
      street_2?: string
      suite_or_apt_number?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE_EXTENDED_UPDATE}`, {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      })
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Failed to update profile')
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update profile' }
    }
  },

  /** GET daily-login — weekly streak + claim status (tries /api/v1 and legacy path). */
  async fetchDailyLoginStatus(
    token: string | null
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!token) return { success: false, error: 'Not authenticated' }
    let lastErr = 'Failed to load daily login'
    for (const path of DAILY_LOGIN_PATHS) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, {
          method: 'GET',
          token,
        })
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const data = (raw?.data ?? raw) as Record<string, unknown>
        if (!res.ok) {
          lastErr = String(raw?.message ?? raw?.detail ?? 'Failed to load daily login')
          if (res.status === 404) continue
          return { success: false, error: lastErr }
        }
        return { success: true, data }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Failed to load daily login'
      }
    }
    return {
      success: true,
      data: {
        current_day: 1,
        days_claimed: [] as number[],
        week_start_date: '',
        __dailyLoginUnavailable: true,
      },
    }
  },

  /** POST daily-login — claim today’s reward (tries /daily-login first, then fallbacks). */
  async claimDailyLoginReward(
    token: string | null
  ): Promise<{
    success: boolean
    data?: Record<string, unknown>
    error?: string
    alreadyClaimed?: boolean
    totalGems?: number
  }> {
    if (!token) return { success: false, error: 'Not authenticated' }
    const pickTotalGems = (raw: Record<string, unknown>, data: Record<string, unknown>) => {
      for (const v of [data.total_gems, raw.total_gems, data.gems, raw.gems]) {
        if (typeof v === 'number' && Number.isFinite(v)) return v
      }
      return undefined
    }
    let lastErr = 'Claim failed'
    for (const path of DAILY_LOGIN_PATHS) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, {
          method: 'POST',
          token,
          body: '{}',
        })
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const data = (raw?.data ?? raw) as Record<string, unknown>
        const msg = String(raw?.message ?? raw?.detail ?? data?.message ?? '').toLowerCase()
        const totalGems = pickTotalGems(raw, data)
        if (!res.ok) {
          lastErr = String(raw?.message ?? raw?.detail ?? 'Claim failed')
          if (res.status === 404) continue
          if (msg.includes('already claimed') || msg.includes('daily reward already')) {
            return { success: true, data, alreadyClaimed: true, totalGems }
          }
          return { success: false, error: lastErr }
        }
        return { success: true, data, totalGems }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Claim failed'
      }
    }
    return {
      success: false,
      error:
        'Daily rewards are not available on this server (endpoint not found). Expected: GET/POST /daily-login.',
    }
  },

  /**
   * POST optional daily double-up (rewarded-ad parity). Tries several paths; returns new gems if provided.
   */
  /**
   * Registered users only — spec path first (`double-gems` returns 403 for guests).
   */
  async claimDailyDoubleUp(
    token: string | null
  ): Promise<{ success: boolean; data?: Record<string, unknown>; gems?: number; error?: string }> {
    if (!token) return { success: false, error: 'Not authenticated' }
    const paths = [
      API_CONFIG.ENDPOINTS.TRIVIA.DOUBLE_GEMS,
      '/daily-login/double-up',
      '/api/v1/daily-login/double-up',
      '/daily-login/double',
    ]
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, {
          method: 'POST',
          token,
          body: '{}',
        })
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const data = (raw?.data ?? raw) as Record<string, unknown>
        if (res.status === 404) continue
        if (!res.ok) {
          return { success: false, error: String(raw?.message ?? raw?.detail ?? 'Double-up unavailable') }
        }
        const gemsCandidate = [data.gems, data.total_gems, raw.gems, raw.total_gems].find(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        )
        return { success: true, data, gems: gemsCandidate }
      } catch {
        continue
      }
    }
    return { success: false, error: 'not_found' }
  },

  /** POST /trivia/free-mode/guest-ad-bonus — guests only (device UUID). */
  async claimGuestAdBonus(): Promise<{
    success: boolean
    data?: GuestAdBonusResult
    error?: string
  }> {
    try {
      const data = await postGuestAdBonus()
      return { success: true, data }
    } catch (e) {
      const err = e as Error & { status?: number }
      return { success: false, error: err.message || 'Guest ad bonus failed' }
    }
  },

  /**
   * GET /faqs — guest (`token: null`) or Bearer. Pass `undefined` to use session from storage.
   */
  async fetchFaqs(explicitToken?: string | null): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const auth =
        explicitToken === undefined
          ? {}
          : { token: explicitToken }
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.FAQS}`, {
        method: 'GET',
        ...auth,
      })
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        return {
          success: false,
          error: String(raw.detail ?? raw.message ?? `HTTP ${res.status}`),
        }
      }
      return { success: true, data: raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load FAQs' }
    }
  },

  async fetchCountries(): Promise<string[]> {
    try {
      const res = await api.get(API_CONFIG.ENDPOINTS.COUNTRIES)
      if (res.status < 200 || res.status >= 300) throw new Error('Failed to load countries')
      const data = res.data
      if (Array.isArray(data)) return data.sort()
      if (Array.isArray(data.countries)) return data.countries.sort()
      throw new Error('Invalid countries response')
    } catch {
      const fallback = await fetch('https://restcountries.com/v3.1/all')
      if (!fallback.ok) throw new Error('Failed to load countries')
      const d = await fallback.json()
      return d.map((c: any) => c.name.common as string).sort()
    }
  },

  /** Draw schedule / pools — backend may require `Authorization` on `/draw/next`. */
  async getNextDraw(
    token?: string | null
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const urls = [
      `${BASE_URL}/draw/next`,
      `${BASE_URL}${API_CONFIG.ENDPOINTS.NEXT_DRAW}`,
    ]
    for (const url of urls) {
      try {
        const res = await fetchWithAuth(url, { method: 'GET', token: token ?? undefined })
        if (res.status === 404) continue
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const data = (raw?.data ?? raw) as Record<string, unknown>
        if (!res.ok) {
          if (res.status === 404) continue
          /** `/draw/next` is public per product spec; some deployments still return 401 without JWT. */
          if (
            (res.status === 401 || res.status === 403) &&
            !hasNonEmptySessionInStorage()
          ) {
            return { success: true, data: {} }
          }
          return { success: false, error: String(raw?.message ?? raw?.detail ?? '') }
        }
        return { success: true, data }
      } catch {
        continue
      }
    }
    return { success: false }
  },

  /**
   * GET recent winners — same family of paths as mobile `/recent-winners`.
   */
  async getRecentWinners(
    token: string | null
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const paths = [
      API_CONFIG.ENDPOINTS.RECENT_WINNERS,
      '/api/v1/recent-winners',
      '/draw/recent-winners',
    ]
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'GET', token })
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        if (res.status === 404) continue
        const data = (raw?.data ?? raw) as Record<string, unknown>
        if (!res.ok) {
          if (res.status === 404) continue
          return { success: false, error: String(raw?.message ?? raw?.detail ?? 'Failed to load winners') }
        }
        return { success: true, data }
      } catch {
        continue
      }
    }
    return { success: false, error: 'Recent winners unavailable' }
  },

  async getFreeModeLeaderboard(
    drawDate: string,
    token?: string | null
  ): Promise<{ success: boolean; data?: { leaderboard?: any[] }; error?: string }> {
    const tryFetch = async (url: string, opts?: RequestInit & { token?: string | null }) => {
      const res = await fetchWithAuth(url, opts ?? {})
      const raw = await res.json().catch(() => ({}))
      const data = raw?.data ?? raw
      if (res.ok) {
        const list = data?.leaderboard ?? data?.leaderboardData ?? (Array.isArray(data) ? data : [])
        return { success: true, data: { leaderboard: Array.isArray(list) ? list : [] } }
      }
      return null
    }
    const urls = [
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD_FREE}?draw_date=${encodeURIComponent(drawDate)}`,
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD}?period=daily`,
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD}?period=all`,
    ]
    for (const url of urls) {
      const result = await tryFetch(url, { token })
      if (result) return result
    }
    return { success: false, error: 'Leaderboard unavailable' }
  },

  async getBronzeModeLeaderboard(
    drawDate: string,
    token?: string | null
  ): Promise<{ success: boolean; data?: { leaderboard?: any[] }; error?: string }> {
    const tryFetch = async (url: string, opts?: RequestInit & { token?: string | null }) => {
      const res = await fetchWithAuth(url, opts ?? {})
      const raw = await res.json().catch(() => ({}))
      const data = raw?.data ?? raw
      if (res.ok) {
        const list = data?.leaderboard ?? data?.leaderboardData ?? (Array.isArray(data) ? data : [])
        return { success: true, data: { leaderboard: Array.isArray(list) ? list : [] } }
      }
      return null
    }
    const result = await tryFetch(
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD_BRONZE}?draw_date=${encodeURIComponent(drawDate)}`,
      { token }
    )
    if (result) return result
    return { success: false, error: 'Bronze leaderboard unavailable' }
  },

  async getSilverModeLeaderboard(
    drawDate: string,
    token?: string | null
  ): Promise<{ success: boolean; data?: { leaderboard?: any[] }; error?: string }> {
    const tryFetch = async (url: string, opts?: RequestInit & { token?: string | null }) => {
      const res = await fetchWithAuth(url, opts ?? {})
      const raw = await res.json().catch(() => ({}))
      const data = raw?.data ?? raw
      if (res.ok) {
        const list = data?.leaderboard ?? data?.leaderboardData ?? (Array.isArray(data) ? data : [])
        return { success: true, data: { leaderboard: Array.isArray(list) ? list : [] } }
      }
      return null
    }
    const result = await tryFetch(
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD_SILVER}?draw_date=${encodeURIComponent(drawDate)}`,
      { token }
    )
    if (result) return result
    const fallback = await tryFetch(
      `${BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD}?period=all`,
      { token }
    )
    return fallback ?? { success: false, error: 'Leaderboard unavailable' }
  },

  async getGlobalChatMessages(
    token: string | null,
    limit = 50
  ): Promise<{ success: boolean; data?: any[]; metadata?: { online: number; unread: number; requests: number }; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.GLOBAL_CHAT.MESSAGES}?limit=${limit}`, {
        method: 'GET',
        ...(token ? { token } : {}),
      })
      const raw = await res.json().catch(() => ({}))
      const fullRaw = raw as Record<string, unknown>
      const data = (fullRaw?.data ?? fullRaw) as Record<string, unknown>
      if (!res.ok) return { success: false, error: String(fullRaw?.message ?? fullRaw?.detail ?? 'Failed to load') }
      
      const list = Array.isArray(data) ? data : (data?.messages as any[]) ?? []
      const metadata = {
        online: Number(data?.online_count ?? fullRaw?.online_count ?? 0),
        unread: Number(data?.unread_messages_count ?? fullRaw?.unread_messages_count ?? 0),
        requests: Number(data?.friend_requests_count ?? fullRaw?.friend_requests_count ?? 0),
      }
      return { success: true, data: list, metadata }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load' }
    }
  },

  async sendGlobalMessage(
    token: string,
    message: string,
    replyToId?: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const body: Record<string, unknown> = { message: message.trim() }
      if (replyToId) body.reply_to_message_id = replyToId
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.GLOBAL_CHAT.SEND}`, {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) return { success: false, error: raw?.message ?? raw?.detail ?? 'Failed to send' }
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to send' }
    }
  },

  async getPrivateConversations(
    token: string | null
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!token) return { success: false, error: 'Not authenticated' }
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.CONVERSATIONS}`,
        { method: 'GET', token }
      )
      const raw = await res.json().catch(() => ({}))
      const data = raw?.data ?? raw
      if (!res.ok) return { success: false, error: raw?.message ?? raw?.detail ?? 'Failed to load' }
      const list = Array.isArray(data) ? data : data?.conversations ?? []
      return { success: true, data: list }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load' }
    }
  },

  async getPrivateMessages(
    token: string | null,
    conversationId: number,
    page = 1,
    perPage = 50
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!token) return { success: false, error: 'Not authenticated' }
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.MESSAGES(conversationId)}?page=${page}&per_page=${perPage}`,
        { method: 'GET', token }
      )
      const raw = await res.json().catch(() => ({}))
      const data = raw?.data ?? raw
      if (!res.ok) return { success: false, error: raw?.message ?? raw?.detail ?? 'Failed to load' }
      const list = Array.isArray(data) ? data : data?.messages ?? []
      return { success: true, data: list }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load' }
    }
  },

  async sendPrivateMessage(
    token: string,
    payload: {
      message: string
      conversation_id?: number
      recipient_id: number
      reply_to_message_id?: number
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.SEND}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) return { success: false, error: raw?.message ?? raw?.detail ?? 'Failed to send' }
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to send' }
    }
  },

  async acceptRejectPrivateChat(
    token: string,
    payload: { conversation_id: number; action: 'accept' | 'reject' }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.PRIVATE_CHAT.ACCEPT_REJECT}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        token,
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) return { success: false, error: raw?.message ?? raw?.detail ?? 'Request failed' }
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Request failed' }
    }
  },

  /** GET notifications — paths vary by deployment; non-200 does not throw. */
  async getNotifications(
    token: string,
    opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<{
    success: boolean
    data?: {
      notifications: Record<string, unknown>[]
      unread_count?: number
      total?: number
    }
    error?: string
  }> {
    const limit = opts.limit ?? 50
    const offset = opts.offset ?? 0
    const unreadOnly = opts.unreadOnly ?? false
    const qs = `limit=${limit}&offset=${offset}&unread_only=${unreadOnly}`
    const paths = [API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST, API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST_ALT]
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}?${qs}`, { method: 'GET', token })
        const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
        if (res.status === 404) continue
        if (!res.ok) continue
        const outer = (raw?.data ?? raw) as Record<string, unknown>
        const list =
          (Array.isArray(outer.notifications) ? outer.notifications : null) ||
          (Array.isArray(raw.notifications) ? raw.notifications : null) ||
          (Array.isArray(raw) ? raw : null) ||
          []
        const unread =
          typeof outer.unread_count === 'number'
            ? outer.unread_count
            : typeof raw.unread_count === 'number'
              ? raw.unread_count
              : undefined
        return {
          success: true,
          data: {
            notifications: list as Record<string, unknown>[],
            unread_count: unread,
            total: typeof outer.total === 'number' ? outer.total : undefined,
          },
        }
      } catch {
        continue
      }
    }
    return { success: false, error: 'Notifications unavailable' }
  },

  async markNotificationIdsRead(token: string, numericIds: number[]): Promise<boolean> {
    if (numericIds.length === 0) return true
    const bodies = [
      { path: API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ, body: { notification_ids: numericIds } },
      { path: API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ_ALT, body: { notification_ids: numericIds } },
    ]
    for (const { path, body } of bodies) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(body),
        })
        if (res.ok) return true
        if (res.status === 404) continue
      } catch {
        continue
      }
    }
    return false
  },

  async markAllNotificationsRead(token: string): Promise<boolean> {
    const paths = [
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ_ALT,
    ]
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'PUT', token })
        if (res.ok) return true
        if (res.status === 404) continue
      } catch {
        continue
      }
    }
    return false
  },

  async deleteNotificationById(token: string, numericId: number): Promise<boolean> {
    const paths = [`/notifications/${numericId}`, `/api/v1/notifications/${numericId}`]
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE', token })
        if (res.ok) return true
        if (res.status === 404) continue
      } catch {
        continue
      }
    }
    return false
  },

  async deleteAllNotifications(token: string): Promise<boolean> {
    const paths = ['/notifications', '/api/v1/notifications']
    for (const path of paths) {
      try {
        const res = await fetchWithAuth(`${BASE_URL}${path}`, { method: 'DELETE', token })
        if (res.ok) return true
        if (res.status === 404) continue
      } catch {
        continue
      }
    }
    return false
  },

  /**
   * GET /app-versions/latest with no `os` query — web client expects an array of
   * `{ os, latest_version, created_at?, updated_at? }` (e.g. iOS + Android).
   * `explicitToken: null` = guest; string = Bearer; `undefined` = use storage.
   */
  async getLatestNativeAppVersions(explicitToken?: string | null): Promise<NativeAppVersionsPayload | null> {
    const authOpts =
      explicitToken === undefined
        ? {}
        : { token: explicitToken }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), Math.min(TIMEOUT, 8000))
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.APP_VERSIONS_LATEST}`, {
        method: 'GET',
        signal: controller.signal,
        ...authOpts,
      })
      clearTimeout(timeoutId)
      if (!res.ok) return null
      const raw = await res.json().catch(() => null)
      const platforms = parseNativeAppVersionsResponse(raw)
      if (platforms.length === 0) return null
      const norm = (o: string) => o.trim().toLowerCase()
      const ios =
        platforms.find((p) => norm(p.os) === 'ios')?.latest_version ??
        platforms.find((p) => norm(p.os) === 'iphone')?.latest_version ??
        null
      const android = platforms.find((p) => norm(p.os) === 'android')?.latest_version ?? null
      return { platforms, ios, android }
    } catch {
      return null
    }
  },

  async fetchWalletInfo(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.WALLET.ME}?include_transactions=true`, {
        method: 'GET',
        token,
      })
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Failed to load wallet info')
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load wallet info' }
    }
  },

  async fetchWalletTransactions(
    token: string,
    params: { page?: number; page_size?: number; kind?: string } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { page = 1, page_size = 20, kind } = params
      let url = `${BASE_URL}${API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS}?page=${page}&page_size=${page_size}`
      if (kind) url += `&kind=${encodeURIComponent(kind)}`
      const res = await fetchWithAuth(url, { method: 'GET', token })
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Failed to load transactions')
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load transactions' }
    }
  },

  async fetchWalletWithdrawals(
    token: string,
    page = 1,
    pageSize = 20
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}${API_CONFIG.ENDPOINTS.WALLET.WITHDRAWALS}?page=${page}&page_size=${pageSize}`,
        { method: 'GET', token }
      )
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Failed to load withdrawals')
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load withdrawals' }
    }
  },

  async requestWithdrawal(
    token: string,
    payload: { amount_usd: number; method: string; details: string }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.WALLET.WITHDRAW}`, {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      })
      const raw = await res.json()
      if (!res.ok) throw new Error(raw?.message || raw?.detail || 'Withdrawal request failed')
      return { success: true, data: raw?.data ?? raw }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Withdrawal request failed' }
    }
  },
}

export type NativeAppVersionRow = {
  os: string
  latest_version: string
  created_at?: string
  updated_at?: string
}

export type NativeAppVersionsPayload = {
  platforms: NativeAppVersionRow[]
  ios: string | null
  android: string | null
}

function parseNativeAppVersionsResponse(body: unknown): NativeAppVersionRow[] {
  let list: unknown[] = []
  if (Array.isArray(body)) {
    list = body
  } else if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    if (Array.isArray(o.data)) list = o.data
    else if (Array.isArray(o.versions)) list = o.versions
    else if (Array.isArray(o.items)) list = o.items
    else if (typeof o.os === 'string' && (o.latest_version != null || o.version != null)) {
      list = [o]
    }
  }

  const out: NativeAppVersionRow[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const os = String(r.os ?? '').trim()
    const latest =
      typeof r.latest_version === 'string'
        ? r.latest_version.trim()
        : typeof r.version === 'string'
          ? r.version.trim()
          : ''
    if (!os || !latest) continue
    const row: NativeAppVersionRow = { os, latest_version: latest }
    if (typeof r.created_at === 'string') row.created_at = r.created_at
    if (typeof r.updated_at === 'string') row.updated_at = r.updated_at
    out.push(row)
  }
  return out
}
