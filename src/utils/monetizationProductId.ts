/**
 * Recognizes API `product_id` values (e.g. `G001`, `AV001`, `SUB_monthly`).
 * Single-letter gem codes like `G001` must be accepted (not only two-letter prefixes).
 */
export function looksLikeMonetizationProductId(s: string): boolean {
  return /^[A-Z][A-Z0-9_-]+$/i.test(s)
}

export type StoreProductPrefix = 'G' | 'AV'

/**
 * Prefer API `product_id`; if missing, derive `{prefix}{id}` with zero-padded numeric `id` (e.g. G001, AV001).
 */
export function resolveStoreProductId(
  prefix: StoreProductPrefix,
  raw: Record<string, unknown>,
): string | null {
  const fromApi =
    typeof raw.product_id === 'string' && raw.product_id.trim() ? raw.product_id.trim() : null
  if (fromApi) return fromApi

  const idRaw = raw.id
  if (typeof idRaw === 'number' && Number.isFinite(idRaw) && idRaw > 0) {
    return `${prefix}${String(Math.trunc(idRaw)).padStart(3, '0')}`
  }
  if (typeof idRaw === 'string' && idRaw.trim()) {
    const s = idRaw.trim()
    if (looksLikeMonetizationProductId(s)) return s
    const n = parseInt(s, 10)
    if (Number.isFinite(n) && n > 0) return `${prefix}${String(n).padStart(3, '0')}`
  }
  return null
}
