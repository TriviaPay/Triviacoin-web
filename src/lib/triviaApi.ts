/**
 * Trivia + profile API via shared Axios instance (guest / Bearer / bind rules in `api/client`).
 */
import { API_CONFIG } from '../config/api'
import { ENV_CONFIG } from '../config/env'
import { api, hasNonEmptySessionInStorage } from '../api/axiosInstance'

/** Minimal shape for free-mode GET stubs when `VITE_USE_GUEST_STUB_ON_401=true` and the API is JWT-only. */
const GUEST_401_DEMO_QUESTION = {
  question_id: -9001,
  question_order: 1,
  question:
    'Placeholder question — your API returned 401 for guests. Deploy guest `X-Device-UUID` support or keep VITE_USE_GUEST_STUB_ON_401=true for local UI only.',
  option_a: 'A',
  option_b: 'B',
  option_c: 'C',
  option_d: 'D',
  correct_answer: 'a',
  hint: '',
  fill_in_answer: null,
  explanation: '',
  category: 'demo',
  difficulty_level: 'easy',
  picture_url: null,
  status: 'unanswered',
  is_correct: null,
  answered_at: null,
} as const

function guestStubForFreeModePath(path: string): unknown | null {
  if (!ENV_CONFIG.useGuestStubOn401 || hasNonEmptySessionInStorage()) return null
  const T = API_CONFIG.ENDPOINTS.TRIVIA
  const today = new Date().toISOString().slice(0, 10)
  if (path === T.FREE_MODE_STATUS) {
    return {
      progress: { correct_answers: 0, total_questions: 1, completed: false },
      completion_time: null,
      is_winner: false,
      current_date: today,
    }
  }
  if (path === T.FREE_MODE_QUESTIONS) {
    return { questions: [{ ...GUEST_401_DEMO_QUESTION }] }
  }
  if (path === T.FREE_MODE_CURRENT) {
    return { question: { ...GUEST_401_DEMO_QUESTION } }
  }
  return null
}

function unwrapPayload(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: unknown }).data
  }
  return raw
}

export async function triviaRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await api.request({
    url: path,
    method: (init?.method ?? 'GET').toLowerCase(),
    data: init?.body,
  })

  const raw = res.data
  const data = unwrapPayload(raw) as Record<string, unknown>

  if (res.status < 200 || res.status >= 300) {
    if (res.status === 401) {
      const stub = guestStubForFreeModePath(path)
      if (stub != null) {
        const g = globalThis as typeof globalThis & { __guestStub401InfoShown?: boolean }
        if (import.meta.env.DEV && !g.__guestStub401InfoShown) {
          g.__guestStub401InfoShown = true
          console.info(
            '[api] VITE_USE_GUEST_STUB_ON_401 is true: using placeholder free-mode responses because the server returns 401 without JWT.',
          )
        }
        return stub as T
      }
    }
    const body = raw as Record<string, unknown>
    const detail = (data as { detail?: unknown })?.detail ?? (body as { detail?: unknown })?.detail
    let msg: string
    if (typeof detail === 'string') msg = detail
    else if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in (detail[0] as object))
      msg = String((detail[0] as { msg?: string }).msg)
    else msg = (data as { message?: string }).message ?? `Request failed (${res.status})`
    const err = new Error(msg) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = data
    throw err
  }

  return data as T
}

export type ModeAccessInfo = {
  has_access?: boolean
  subscription_status?: string
  subscription_details?: unknown
  mode_name?: string
  /** Billable subscription product id from DB — use for Stripe/PayPal subscription checkout. */
  product_id?: string
  /** Entry fee for the tier */
  price?: number
  questions_remaining?: number
  task_completed?: boolean
  /** Status line from API (rewards timing, completion, etc.) */
  message?: string
  in_reset_window?: boolean
  reset_window_minutes_left?: number
}

export type ModesStatusResponse = {
  free_mode?: ModeAccessInfo
  bronze_mode?: ModeAccessInfo
  silver_mode?: ModeAccessInfo
  gold_mode?: ModeAccessInfo
  platinum_mode?: ModeAccessInfo
}

/** POST /trivia/free-mode/guest-ad-bonus (guests only). */
export type GuestAdBonusResult = {
  success?: boolean
  original_gems?: number
  bonus_gems?: number
  total_gems?: number
}

/**
 * One-time guest ad bonus. Uses `X-Device-UUID` only (interceptor).
 * 400 = already claimed; 403 = not guest or feature off; 429 = rate limit.
 */
export async function postGuestAdBonus(): Promise<GuestAdBonusResult> {
  const res = await api.post(API_CONFIG.ENDPOINTS.TRIVIA.GUEST_AD_BONUS, {})
  const raw = (res.data && typeof res.data === 'object' ? res.data : {}) as Record<string, unknown>
  const data = (unwrapPayload(raw) ?? raw) as Record<string, unknown>

  if (res.status < 200 || res.status >= 300) {
    const detail = data.detail ?? raw.detail
    let msg: string
    if (typeof detail === 'string') msg = detail
    else if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in (detail[0] as object))
      msg = String((detail[0] as { msg?: string }).msg)
    else msg = (data.message as string) ?? `Request failed (${res.status})`
    const err = new Error(msg) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = data
    throw err
  }

  return {
    success: data.success !== false,
    original_gems: typeof data.original_gems === 'number' ? data.original_gems : undefined,
    bonus_gems: typeof data.bonus_gems === 'number' ? data.bonus_gems : undefined,
    total_gems: typeof data.total_gems === 'number' ? data.total_gems : undefined,
  }
}

/**
 * `/profile/modes/status` is account-scoped; backends often require JWT and return 401 for guests.
 * Guest UX uses `/trivia/free-mode/status` (device UUID) and synthesizes a minimal modes payload.
 */
async function guestModesStatusFromFreeTrivia(): Promise<ModesStatusResponse> {
  try {
    const raw = await triviaRequest<unknown>(API_CONFIG.ENDPOINTS.TRIVIA.FREE_MODE_STATUS)
    const r = raw as Record<string, unknown>
    const prog = (r.progress as Record<string, unknown>) || {}
    const completed =
      prog.completed === true || r.all_questions_answered === true || r.completed === true
    const total = typeof prog.total_questions === 'number' ? prog.total_questions : 0
    const correct = typeof prog.correct_answers === 'number' ? prog.correct_answers : 0
    const remaining = total > 0 ? Math.max(0, total - correct) : undefined
    return {
      free_mode: {
        has_access: true,
        price: 0,
        mode_name: 'Free',
        task_completed: completed,
        questions_remaining: remaining,
        message: typeof r.message === 'string' ? r.message : undefined,
      },
      bronze_mode: { has_access: false, price: 5 },
      silver_mode: { has_access: false, price: 10 },
      gold_mode: { has_access: false, price: 15 },
      platinum_mode: { has_access: false, price: 20 },
    }
  } catch {
    return {
      free_mode: { has_access: true, price: 0, mode_name: 'Free' },
      bronze_mode: { has_access: false, price: 5 },
      silver_mode: { has_access: false, price: 10 },
      gold_mode: { has_access: false, price: 15 },
      platinum_mode: { has_access: false, price: 20 },
    }
  }
}

export async function fetchModesStatusCached(): Promise<ModesStatusResponse> {
  const path = API_CONFIG.ENDPOINTS.PROFILE_MODES_STATUS
  const res = await api.get(path)

  if (res.status >= 200 && res.status < 300) {
    return unwrapPayload(res.data) as ModesStatusResponse
  }

  if ((res.status === 401 || res.status === 403) && !hasNonEmptySessionInStorage()) {
    return guestModesStatusFromFreeTrivia()
  }

  const raw = res.data as Record<string, unknown>
  const detail = raw?.detail
  const msg =
    typeof detail === 'string'
      ? detail
      : (raw?.message as string | undefined) ?? `Request failed (${res.status})`
  throw new Error(msg)
}
