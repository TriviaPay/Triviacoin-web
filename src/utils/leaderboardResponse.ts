import type { LeaderboardTier } from '../store/uiSlice'

const LIST_KEYS = [
  'leaderboard',
  'leaderboardData',
  'entries',
  'results',
  'winners',
  'recent_winners',
  'players',
  'items',
  'rows',
] as const

/** Normalize API payloads — backends vary (nested `data`, `status: success`, key names). */
export function extractListFromApiPayload(raw: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4) return []
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  }
  if (!raw || typeof raw !== 'object') return []

  const r = raw as Record<string, unknown>

  if (r.status === 'success' && r.data != null) {
    const nested = extractListFromApiPayload(r.data, depth + 1)
    if (nested.length) return nested
  }

  for (const key of LIST_KEYS) {
    const v = r[key]
    if (Array.isArray(v)) {
      return v.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
    }
  }

  if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
    const nested = extractListFromApiPayload(r.data, depth + 1)
    if (nested.length) return nested
  }

  return []
}

const TIER_MODE_ALIASES: Record<LeaderboardTier, string[]> = {
  bronze: ['bronze', 'rookie', 'free', 'free_mode', 'free-mode'],
  silver: ['silver', 'scholar'],
}

export function modeMatchesLeaderboardTier(modeRaw: unknown, tier: LeaderboardTier): boolean {
  const mode = String(modeRaw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  if (!mode) return true
  const aliases = TIER_MODE_ALIASES[tier]
  return aliases.some((a) => mode === a || mode.includes(a))
}

/** Filter recent-winners for Rookie/Scholar tab; relax draw_date if strict match is empty. */
export function filterRecentWinnersForTier(
  list: Record<string, unknown>[],
  tier: LeaderboardTier,
  drawDate: string
): Record<string, unknown>[] {
  const byMode = list.filter((w) => modeMatchesLeaderboardTier(w.mode, tier))
  if (!drawDate) return byMode

  const byDate = byMode.filter((w) => {
    const dd = String(w.draw_date ?? w.date ?? w.drawDate ?? '').slice(0, 10)
    return !dd || dd === drawDate
  })
  return byDate.length > 0 ? byDate : byMode
}
