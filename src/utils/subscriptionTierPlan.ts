import type { ModesStatusResponse } from '../lib/triviaApi'
import type { SubscriptionPlan } from '../types/subscriptionPlan'
import { getModeInfo } from './triviaTierMeta'

/** Paid tier index 1–4 → plan row; matches `modes/status` `product_id` when present, else price order. */
export function subscriptionPlanForTier(
  tierIdx: number,
  plans: SubscriptionPlan[],
  modesStatus: ModesStatusResponse | null,
): SubscriptionPlan | null {
  if (tierIdx < 1 || tierIdx > 4) return null
  const info = getModeInfo(tierIdx, modesStatus)
  const pid = info?.product_id?.trim()
  if (pid && plans.length > 0) {
    const hit = plans.find((p) => p.productId === pid)
    if (hit) return hit
  }
  const sorted = [...plans].sort(
    (a, b) => a.priceMinor - b.priceMinor || a.productId.localeCompare(b.productId),
  )
  return sorted[tierIdx - 1] ?? null
}

/** When `/store/subscriptions` and modes omit `product_id`, backend tier order SUB001…SUB004. */
export function fallbackSubscriptionProductIdForTier(tierIdx: number): string | null {
  if (tierIdx < 1 || tierIdx > 4) return null
  return `SUB${String(tierIdx).padStart(3, '0')}`
}

/** `product_id` sent to Stripe/PayPal — catalog, modes `product_id`, else SUB001–SUB004 fallback. */
export function billableSubscriptionProductId(
  tierIdx: number,
  plans: SubscriptionPlan[],
  modesStatus: ModesStatusResponse | null,
): string | null {
  const plan = subscriptionPlanForTier(tierIdx, plans, modesStatus)
  if (plan?.productId) return plan.productId
  const info = getModeInfo(tierIdx, modesStatus)
  const fromModes = info?.product_id?.trim()
  if (fromModes) return fromModes
  return fallbackSubscriptionProductIdForTier(tierIdx)
}
