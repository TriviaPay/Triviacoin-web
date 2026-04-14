import type { ModeAccessInfo, ModesStatusResponse } from '../lib/triviaApi'

export type TriviaTierMeta = {
  tierLabel: string
  entryLabel: string
  prizeLabel: string
  subscribedHint?: string
}

const TIER_CARD_NAMES = ['Free', '$5', '$10', '$15', '$20'] as const

export function formatMoney(price: number | undefined, fallback: string): string {
  if (price != null && !Number.isNaN(Number(price))) return `$${Number(price)}`
  return fallback
}

/**
 * Whether the user may enter this mode: explicit access, or an active subscription on this tier
 * (API may return `subscription_status: "active"` before `has_access` flips true).
 */
export function modeAllowsPlay(info: ModeAccessInfo | null): boolean {
  if (!info) return false
  if (info.has_access === true) return true
  const st = String(info.subscription_status ?? '').toLowerCase()
  return st === 'active' || st === 'trialing' || st === 'subscribed' || st === 'paid'
}

export function getModeInfo(idx: number, ms: ModesStatusResponse | null): ModeAccessInfo | null {
  if (!ms) return null
  switch (idx) {
    case 0:
      return ms.free_mode ?? null
    case 1:
      return ms.bronze_mode ?? null
    case 2:
      return ms.silver_mode ?? null
    case 3:
      return ms.gold_mode ?? null
    case 4:
      return ms.platinum_mode ?? null
    default:
      return null
  }
}

export function prizeLineFromInfo(info: ModeAccessInfo | null): string {
  if (!info) return ''
  const bits: string[] = []
  if (info.mode_name) bits.push(info.mode_name)
  if (info.task_completed === true) bits.push('Task completed')
  return bits.join(' · ')
}

export function buildTierMeta(idx: number, ms: ModesStatusResponse | null): TriviaTierMeta {
  const cardName = TIER_CARD_NAMES[idx] ?? 'Free'
  const info = getModeInfo(idx, ms)
  const entry =
    idx === 0
      ? formatMoney(ms?.free_mode?.price, '$0')
      : idx === 1
        ? formatMoney(ms?.bronze_mode?.price, '$5')
        : idx === 2
          ? formatMoney(ms?.silver_mode?.price, '$10')
          : idx === 3
            ? formatMoney(ms?.gold_mode?.price, '$15')
            : formatMoney(ms?.platinum_mode?.price, '$20')

  const tierLabel =
    idx === 0
      ? 'Free'
      : idx === 1
        ? 'Bronze'
        : idx === 2
          ? 'Silver'
          : idx === 3
            ? 'Gold ($15)'
            : 'Platinum ($20)'

  const prizeLabel =
    prizeLineFromInfo(info) || (idx === 0 ? 'Practice + XP' : 'Top score +150 XP')

  const subscribedHint =
    info?.has_access && info?.subscription_status && info.subscription_status !== 'not_required'
      ? `Status: ${info.subscription_status}`
      : undefined

  return {
    tierLabel: `${tierLabel} · ${cardName}`,
    entryLabel: entry,
    prizeLabel,
    subscribedHint,
  }
}
