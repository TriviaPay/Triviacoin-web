/**
 * JWT payload decoding (read-only, no signature verification).
 * Used to extract descope_user_id (sub) and email from session JWT for sync.
 */
export interface JwtPayload {
  sub?: string
  email?: string
  'd-us'?: string
  [key: string]: unknown
}

/** Three segments — enough to choose Bearer vs guest `X-Device-UUID` (payload not verified here). */
export function looksLikeJwt(token: string): boolean {
  const t = typeof token === 'string' ? token.trim() : ''
  if (!t) return false
  const parts = t.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

/** Extract Descope userId from JWT. Descope uses 'sub' or sometimes 'd-us'. */
export function getDescopeUserIdFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  return payload.sub ?? payload['d-us'] ?? null
}

/** Extract project id from Descope session JWT `iss` (e.g. …/P2yoVmehdHRYCZPehBOpMd97WMsH). */
export function getDescopeProjectIdFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const iss = payload.iss
  if (typeof iss === 'string') {
    const m = iss.match(/\/([A-Za-z0-9]{10,})$/)
    if (m?.[1]) return m[1]
  }
  for (const key of ['dprj', 'projectId', 'project_id']) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Extract email from JWT if present. */
export function getEmailFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const email = payload.email ?? payload['d-em']
  return typeof email === 'string' ? email : null
}
