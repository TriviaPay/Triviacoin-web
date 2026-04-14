/**
 * Single Axios instance for all backend API traffic.
 * Guest → ONLY X-Device-UUID | Logged-in → ONLY Authorization | Bind → BOTH
 */
import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { API_CONFIG } from '../config/api'
import { DESCOPE_CONFIG } from '../config/descope'
import { ENV_CONFIG } from '../config/env'
import { looksLikeJwt } from '../lib/jwt'
import { emitSessionInvalidated } from '../lib/sessionInvalidate'
import { getOrCreateDeviceUUID } from '../utils/deviceUUID'

/** Same keys as auth persistence — read storage directly so interceptors never see a stale in-memory cache. */
const ACCESS_TOKEN_STORAGE_KEYS = [DESCOPE_CONFIG.sessionTokenKey, 'token'] as const

function readAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw && raw.trim().length > 0) return normalizeAccessToken(raw)
    }
  } catch {
    /* private mode / blocked storage */
  }
  return null
}

/**
 * Any non-empty value in session storage keys (guest vs signed-in heuristic).
 * Used to decide whether `/profile/*` 401 should fall back to guest trivia endpoints.
 */
export function hasNonEmptySessionInStorage(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false
  try {
    for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
      const v = localStorage.getItem(key)
      if (v && v.trim().length > 0) return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/** Trim and strip a leading `Bearer ` prefix so JWT shape checks work. */
function normalizeAccessToken(raw: string): string {
  let t = raw.trim()
  if (/^bearer\s+/i.test(t)) t = t.replace(/^bearer\s+/i, '').trim()
  return t
}

/** Avoid passing `headers: {}` or `undefined` into axios — can prevent proper merging with defaults. */
function pickRequestHeaders(init?: HeadersInit): Record<string, string> | undefined {
  if (init == null) return undefined
  if (init instanceof Headers) {
    const out: Record<string, string> = {}
    init.forEach((v, k) => {
      out[k] = v
    })
    return Object.keys(out).length > 0 ? out : undefined
  }
  if (Array.isArray(init)) {
    const out = Object.fromEntries(init.filter((e) => e && e[0])) as Record<string, string>
    return Object.keys(out).length > 0 ? out : undefined
  }
  const out = { ...init }
  return Object.keys(out).length > 0 ? out : undefined
}

export const api = axios.create({
  baseURL: ENV_CONFIG.API_BASE_URL,
  timeout: ENV_CONFIG.API_TIMEOUT,
  validateStatus: () => true,
  /** Prefer XHR so Request Headers in DevTools match what we set (fetch adapter path differs slightly). */
  adapter: typeof XMLHttpRequest !== 'undefined' ? (['xhr'] as const) : undefined,
  headers: {
    Accept: 'application/json',
  },
})

/**
 * Axios 1.x `post` / `put` / `patch` merge `headers: {}` into the request config internally.
 * That empty object participates in header merge and has caused missing auth headers on the wire
 * while interceptors still logged the expected values. Bypass that by using `request()` only.
 */
function bypassEmptyHeadersMergeOnDataVerbs(instance: AxiosInstance) {
  for (const method of ['post', 'put', 'patch'] as const) {
    type DataVerb = (url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse>
    const request = instance.request.bind(instance)
    ;(instance as unknown as Record<string, DataVerb>)[method] = (url, data, config) =>
      request({
        ...(config ?? {}),
        method,
        url,
        data,
      })
  }
}
bypassEmptyHeadersMergeOnDataVerbs(api)

export type FetchWithAuthCompatOptions = {
  method?: string
  body?: BodyInit | string | null
  headers?: HeadersInit
  /** JWT: non-empty string. `null` = force guest (X-Device-UUID only). Omit = read token from localStorage. */
  token?: string | null
  /** Rare: send guest headers even if a session exists in storage. */
  _forceGuest?: boolean
  _retryAfterRefresh?: boolean
  _bindWithDevice?: boolean
  signal?: AbortSignal | null
}

function axiosResponseToFetch(response: AxiosResponse): Response {
  let body = ''
  if (response.data !== undefined && response.data !== '') {
    body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
  }
  return new Response(body, { status: response.status, statusText: response.statusText })
}

/** Drop-in replacement for previous `fetchWithAuth` (returns `Response` for existing callers). */
export async function fetchWithAuth(url: string, options: FetchWithAuthCompatOptions = {}): Promise<Response> {
  const {
    token: tokenOption,
    _forceGuest,
    _retryAfterRefresh,
    _bindWithDevice,
    body,
    method,
    headers: initHeaders,
    signal,
  } = options

  let rel = url
  const base = ENV_CONFIG.API_BASE_URL.replace(/\/$/, '')
  if (url.startsWith(base)) {
    rel = url.slice(base.length)
    /** `https://host//path` → avoid `//path` (axios treats as absolute / wrong origin). */
    rel = '/' + rel.replace(/^\/+/, '')
  }

  let data: unknown = undefined
  if (body != null && body !== '' && typeof body === 'string') {
    try {
      data = JSON.parse(body)
    } catch {
      data = body
    }
  }

  const meta: NonNullable<AxiosRequestConfig['meta']> = {}
  if (typeof tokenOption === 'string' && tokenOption.trim().length > 0) {
    meta.tokenOverride = normalizeAccessToken(tokenOption)
  } else if (tokenOption === null) {
    meta.tokenOverride = null
  } else if (_forceGuest) {
    meta.tokenOverride = null
  }
  if (_retryAfterRefresh) meta._retryAfterRefresh = true
  if (_bindWithDevice) meta.bindWithDevice = true

  const extraHeaders = pickRequestHeaders(initHeaders)

  const response = await api.request({
    url: rel,
    method: (method ?? 'GET').toLowerCase(),
    data,
    ...(extraHeaders ? { headers: extraHeaders } : {}),
    signal: signal ?? undefined,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  })

  return axiosResponseToFetch(response)
}

api.interceptors.request.use((config) => {
  const meta = { ...(config.meta ?? {}) }

  if (meta.skipAuthHeaders) {
    config.headers = AxiosHeaders.from(config.headers ?? {})
    const h = config.headers
    if (!h.has('Accept')) h.set('Accept', 'application/json')
    meta.__hadBearer = Boolean(h.get('Authorization'))
    config.meta = meta

    if (import.meta.env.DEV) {
      const path = config.baseURL ? `${config.baseURL}${config.url ?? ''}` : config.url
      console.log('USING API INSTANCE', path)
      console.log('HEADERS BEFORE SEND', config.headers)
      console.log('FINAL HEADERS:', config.headers)
    }
    return config
  }

  const raw = meta.tokenOverride !== undefined ? meta.tokenOverride : readAccessTokenFromStorage()
  const trimmed = raw && String(raw).trim().length > 0 ? normalizeAccessToken(String(raw)) : null
  const accessToken = trimmed && looksLikeJwt(trimmed) ? trimmed : null
  const bindWithDevice = meta.bindWithDevice === true

  /** Always materialize a headers bag — do not leave `headers` undefined for later merge steps. */
  config.headers = AxiosHeaders.from(config.headers ?? {})
  const h = config.headers

  h.delete('Authorization')
  h.delete('X-Device-UUID')

  if (accessToken && bindWithDevice) {
    h.set('Authorization', `Bearer ${accessToken}`)
    h.set('X-Device-UUID', getOrCreateDeviceUUID())
    meta.__hadBearer = true
  } else if (accessToken) {
    h.set('Authorization', `Bearer ${accessToken}`)
    meta.__hadBearer = true
  } else {
    h.delete('Authorization')
    h.set('X-Device-UUID', getOrCreateDeviceUUID())
    meta.__hadBearer = false
  }

  if (!h.has('Accept')) h.set('Accept', 'application/json')

  config.meta = meta

  if (import.meta.env.DEV) {
    const mode = accessToken && bindWithDevice ? 'bind' : accessToken ? 'bearer' : 'guest'
    const path = config.baseURL ? `${config.baseURL}${config.url ?? ''}` : config.url
    console.log('[api]', (config.method ?? 'get').toUpperCase(), path, {
      mode,
      'X-Device-UUID': h.has('X-Device-UUID'),
      Authorization: h.has('Authorization'),
    })
    console.log('USING API INSTANCE', path)
    console.log('HEADERS BEFORE SEND', config.headers)
    console.log('FINAL HEADERS:', config.headers)
  }

  return config
})

function detailFromResponseBody(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') return undefined
  const o = data as Record<string, unknown>
  const d = o.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0] && typeof d[0] === 'object' && 'msg' in (d[0] as object))
    return String((d[0] as { msg?: string }).msg)
  const m = o.message
  if (typeof m === 'string') return m
  return undefined
}

api.interceptors.response.use(async (response) => {
  const { config, status } = response
  const meta = config.meta ?? {}

  if (status === 401 && import.meta.env.DEV && !meta.skipAuthHeaders) {
    const h = AxiosHeaders.from(config.headers)
    const data = response.data as { detail?: unknown } | undefined
    const detailText = detailFromResponseBody(response.data)
    console.warn('[api] 401', {
      url: config.baseURL && config.url ? `${config.baseURL}${config.url}` : config.url,
      mode: meta.__hadBearer ? 'bearer' : 'guest',
      hasAuthorization: h.has('Authorization'),
      hasXDeviceUuid: h.has('X-Device-UUID'),
      detail: data && typeof data === 'object' ? data.detail : undefined,
    })
    const isGuest = meta.__hadBearer !== true
    if (
      isGuest &&
      h.has('X-Device-UUID') &&
      detailText &&
      /authorization|token missing/i.test(detailText)
    ) {
      const g = globalThis as typeof globalThis & { __triviaGuest401Explained?: boolean }
      if (!g.__triviaGuest401Explained) {
        g.__triviaGuest401Explained = true
        console.warn(
          '[api] Guest Mode request is correct per integration guide (X-Device-UUID only, no Authorization). ' +
            'Your spec says 401 applies when both Authorization and X-Device-UUID are missing — this server still returns JWT-only errors. ' +
            'Deploy backend guest auth for this host, or in dev rely on guest stubs (default) / set VITE_USE_GUEST_STUB_ON_401=false to see raw 401s.'
        )
      }
    }
  }

  if (status === 401) {
    const hadBearer = meta.__hadBearer === true
    if (hadBearer && !meta._retryAfterRefresh) {
      const { refreshSessionIfNeeded } = await import('../lib/sessionRefresh')
      const ok = await refreshSessionIfNeeded()
      if (ok) {
        return api.request({
          ...config,
          headers: new AxiosHeaders(config.headers),
          meta: { ...meta, _retryAfterRefresh: true },
        })
      }
      emitSessionInvalidated()
    } else if (hadBearer && meta._retryAfterRefresh) {
      emitSessionInvalidated()
    }
  }

  if (status === 403) {
    const msg = detailFromResponseBody(response.data) ?? 'Please sign up to use this feature'
    console.warn('[api] 403', msg, config.url)
  } else if (status === 409) {
    const msg = detailFromResponseBody(response.data) ?? 'Email or username is already taken'
    console.warn('[api] 409', msg, config.url)
  } else if (status === 429) {
    const msg =
      detailFromResponseBody(response.data) ??
      'Too many guest accounts from this network. Please try again later.'
    console.warn('[api] 429', msg, config.url)
  }

  return response
})

/** Example GET — headers applied by interceptor. */
export async function exampleGetJson<T>(relativePath: string) {
  return api.get<T>(relativePath)
}

/** Example bind-password — requires meta.bindWithDevice for BOTH headers. */
export async function exampleBindPassword(sessionJwt: string, body: Record<string, unknown>) {
  return api.post(API_CONFIG.ENDPOINTS.BIND_PASSWORD, body, {
    meta: { bindWithDevice: true, tokenOverride: sessionJwt },
  })
}
