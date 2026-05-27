/**
 * API Service - Backend API calls for auth, countries, etc.
 * Uses ENV_CONFIG.API_BASE_URL (trivia-back-end.vercel.app)
 */
import { API_CONFIG } from '../config/api'
import { ENV_CONFIG } from '../config/env'
import { api, fetchWithAuth } from '../api/axiosInstance'
import { postGuestAdBonus, type GuestAdBonusResult } from '../lib/triviaApi'
import { extractListFromApiPayload } from '../utils/leaderboardResponse'

const BASE_URL = API_CONFIG.BASE_URL

function leaderboardFromResponse(raw: unknown): { success: true; data: { leaderboard: unknown[] } } | null {
  const list = extractListFromApiPayload(raw)
  if (!Array.isArray(raw) && raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    if (!r.ok && r.status && typeof r.status === 'number' && r.status >= 400) return null
  }
  return { success: true, data: { leaderboard: list } }
}

function apiErrorMessage(raw: Record<string, unknown>, fallback: string): string {
  const detail = raw.detail ?? raw.message ?? raw.error
  if (typeof detail === 'string' && detail.trim()) return detail
  return fallback
}

function unwrapApiData(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.status === 'success' && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data as Record<string, unknown>
  }
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data as Record<string, unknown>
  }
  return raw
}

function toProfileUploadFile(file: File | Blob, filename = 'profile.jpg'): File {
  if (file instanceof File) {
    if (file.type.startsWith('image/')) return file
    return new File([file], filename, { type: 'image/jpeg', lastModified: file.lastModified })
  }
  return new File([file], filename, { type: file.type || 'image/jpeg' })
}

/** Deployments differ: unversioned vs /api/v1 — try alternates when the server returns 404. */
const DAILY_LOGIN_PATHS = [
  API_CONFIG.ENDPOINTS.TRIVIA.DAILY_LOGIN,
  '/api/v1/daily-login',
  '/trivia/daily-login',
  '/api/v1/trivia/daily-login',
] as const

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

  /**
   * POST /bind-password — persists profile + sets active password in Descope (server-side).
   * Sign-in uses Descope `password.signIn` with the same email loginId after bind succeeds.
   */
  async bindPassword(params: {
    email: string
    password: string
    username: string
    country: string
    dateOfBirth: string
    referral_code?: string | null
    descope_user_id?: string
  }, token: string): Promise<{
    success: boolean
    data?: any
    error?: string
    /** 409 — user already registered; safe to continue if Descope password.update succeeded */
    alreadyBound?: boolean
  }> {
    try {
      const body: Record<string, unknown> = {
        email: params.email.trim().toLowerCase(),
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
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (res.status === 409) {
        const detail = data.detail as { error?: string; message?: string } | string | undefined
        const code = typeof detail === 'object' && detail ? detail.error : undefined
        if (code === 'account_already_bound') {
          return {
            success: false,
            alreadyBound: true,
            error:
              (typeof detail === 'object' && detail?.message) ||
              'This account is already registered.',
          }
        }
      }
      if (!res.ok) {
        const detail = data.detail
        const msg =
          (typeof detail === 'object' && detail && 'message' in detail
            ? String((detail as { message?: string }).message)
            : null) ||
          (typeof detail === 'string' ? detail : null) ||
          String(data.message ?? 'Bind password failed')
        throw new Error(msg)
      }
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Bind password failed' }
    }
  },

  async fetchProfileSummary(_token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    /** Profile GET routes are not deployed on trivia-back-end; callers use JWT/local fallbacks. */
    return { success: false, error: 'Profile summary unavailable' }
  },

  async uploadProfilePicture(
    token: string,
    file: File | Blob,
    filename = 'profile.jpg'
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const uploadFile = toProfileUploadFile(file, filename)
      const form = new FormData()
      form.append('file', uploadFile, uploadFile.name)
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE_UPLOAD_PIC}`, {
        method: 'POST',
        body: form,
        token,
      })
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(apiErrorMessage(raw, 'Failed to upload profile picture. Please try again.'))
      }
      return { success: true, data: unwrapApiData(raw) }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to upload profile picture. Please try again.',
      }
    }
  },

  /** Owned avatar catalog for profile picker; falls back to empty when route is absent. */
  async fetchOwnedAvatars(
    token: string,
  ): Promise<{ success: boolean; data?: Array<{ id: string; name?: string; url?: string }>; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/shop/avatars/owned`, { method: 'GET', token })
      if (!res.ok) return { success: true, data: [] }
      const raw = (await res.json()) as Record<string, unknown>
      const list = (raw?.data ?? raw?.avatars ?? raw?.items) as unknown
      if (!Array.isArray(list)) return { success: true, data: [] }
      const data: Array<{ id: string; name?: string; url?: string }> = []
      for (const row of list) {
        if (!row || typeof row !== 'object') continue
        const o = row as Record<string, unknown>
        const id = String(o.id ?? o.avatar_id ?? '').trim()
        const urlRaw = o.url ?? o.image_url
        const url = typeof urlRaw === 'string' ? urlRaw.trim() : undefined
        const nameRaw = o.name
        const name = typeof nameRaw === 'string' ? nameRaw.trim() : undefined
        if (!id && !url) continue
        data.push({ id: id || (url ?? 'avatar'), name, url })
      }
      return { success: true, data }
    } catch {
      return { success: true, data: [] }
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

  /** Draw schedule — `/draw/next` is not deployed; return empty payload so UI keeps working. */
  async getNextDraw(
    _token?: string | null
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    return { success: true, data: {} }
  },

  /** Recent winners — try known paths; return empty list if none exist (no throw). */
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
        if (!res.ok) {
          if (res.status === 404) continue
          return { success: false, error: String(raw?.message ?? raw?.detail ?? 'Failed to load winners') }
        }
        const list = extractListFromApiPayload(raw)
        return { success: true, data: { winners: list } }
      } catch {
        continue
      }
    }
    return { success: true, data: { winners: [] } }
  },

  async getFreeModeLeaderboard(
    drawDate: string,
    token?: string | null
  ): Promise<{ success: boolean; data?: { leaderboard?: any[] }; error?: string }> {
    const tryFetch = async (url: string, opts?: RequestInit & { token?: string | null }) => {
      const res = await fetchWithAuth(url, opts ?? {})
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) return null
      return leaderboardFromResponse(raw)
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
      if (!res.ok) return null
      return leaderboardFromResponse(raw)
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
      if (!res.ok) return null
      return leaderboardFromResponse(raw)
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
  ): Promise<{
    success: boolean
    data?: any[]
    metadata?: {
      online: number
      unread: number
      unreadGlobal: number
      unreadPrivate: number
      requests: number
    }
    error?: string
  }> {
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
      const num = (v: unknown) => {
        const x = Number(v)
        return Number.isFinite(x) ? x : 0
      }
      const metadata = {
        online: num(data?.online_count ?? fullRaw?.online_count),
        unread: num(data?.unread_messages_count ?? fullRaw?.unread_messages_count),
        unreadGlobal: num(data?.unread_global_count ?? fullRaw?.unread_global_count),
        unreadPrivate: num(data?.unread_private_count ?? fullRaw?.unread_private_count),
        requests: num(data?.friend_requests_count ?? fullRaw?.friend_requests_count),
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

  async fetchWalletEarnings(token: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const res = await fetchWithAuth(`${BASE_URL}${API_CONFIG.ENDPOINTS.WALLET.EARNINGS}`, {
        method: 'GET',
        token,
      })
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(apiErrorMessage(raw, 'Failed to load earnings'))
      }
      const data = unwrapApiData(raw)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load earnings' }
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
