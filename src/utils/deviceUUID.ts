const STORAGE_KEY = 'device_uuid'
/** Legacy / mobile key seen in some builds — reuse so the backend sees the same guest id. */
const LEGACY_ALT_KEY = 'trivia_device_uuid_v1'

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function randomUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Persisted guest device id for `X-Device-UUID`. Survives refresh; logout must not remove it.
 */
export function getOrCreateDeviceUUID(): string {
  try {
    let existing = localStorage.getItem(STORAGE_KEY)
    if (!existing || !UUID_V4_RE.test(existing)) {
      const alt = localStorage.getItem(LEGACY_ALT_KEY)
      if (alt && UUID_V4_RE.test(alt)) {
        localStorage.setItem(STORAGE_KEY, alt)
        existing = alt
      }
    }
    if (existing && UUID_V4_RE.test(existing)) return existing
    const next = randomUuidV4()
    localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return randomUuidV4()
  }
}
