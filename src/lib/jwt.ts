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

/** Extract email from JWT if present. */
export function getEmailFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const email = payload.email ?? payload['d-em']
  return typeof email === 'string' ? email : null
}
