import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../store/store'
import {
  claimDailyLoginReward,
  clearDailyRewardsMessage,
  fetchDailyLoginStatus,
  transformDailyLoginToRewards,
} from '../../store/dailyRewardsSlice'
import type { DailyRewardRow } from '../../store/dailyRewardsSlice'
import { fetchUserGems, setUserGemsBalance } from '../../store/shopSlice'
import { apiService } from '../../services/apiService'
import gemImg from '../../assets/diamond.png'
import diamondsImg from '../../assets/diamonds.png'

type Props = {
  open: boolean
  onClose: () => void
}

type GemFly = {
  from: { x: number; y: number; w: number; h: number }
  to: { x: number; y: number; w: number; h: number }
}

function getDailyDoubleStorageKey() {
  const d = new Date()
  return `trivia_daily_double_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dayNumberToName: Record<number, string> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
}

const defaultRewardsTemplate: Omit<DailyRewardRow, 'claimed' | 'enabled' | 'isToday'>[] = [
  { day: 1, type: 'diamond', value: 10, color: '#0066CC' },
  { day: 2, type: 'diamond', value: 10, color: '#0066CC' },
  { day: 3, type: 'diamond', value: 15, color: '#CC0066' },
  { day: 4, type: 'diamond', value: 15, color: '#0066CC' },
  { day: 5, type: 'diamond', value: 20, color: '#CC0066' },
  { day: 6, type: 'diamond', value: 20, color: '#0066CC' },
  { day: 7, type: 'diamonds', value: 30, color: '#CC0066' },
]

function AssetGem({ className, alt = '' }: { className?: string; alt?: string }) {
  return <img src={gemImg} alt={alt} className={`object-contain select-none ${className ?? ''}`} draggable={false} />
}

function AssetDiamondsTotal({ className, alt = '' }: { className?: string; alt?: string }) {
  return <img src={diamondsImg} alt={alt} className={`object-contain select-none ${className ?? ''}`} draggable={false} />
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V11a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
    </svg>
  )
}

function RewardCard({
  reward,
  currentDay,
  scalePulse,
  onClaim,
  disabled,
}: {
  reward: DailyRewardRow
  currentDay: number
  scalePulse: boolean
  onClaim: (day: number) => void
  disabled: boolean
}) {
  const isActive = reward.day === currentDay && reward.enabled && !reward.claimed
  const missed = reward.enabled && !reward.claimed && reward.day < currentDay
  const locked = !reward.enabled

  return (
    <motion.button
      type="button"
      data-daily-card={reward.day}
      disabled={!isActive || disabled}
      onClick={() => isActive && onClaim(reward.day)}
      className={[
        'relative flex min-h-[3rem] flex-col overflow-hidden rounded-xl border p-1 text-left shadow-md transition sm:min-h-[4.5rem] sm:rounded-2xl sm:p-1.5',
        'bg-gradient-to-b from-white/[0.08] to-transparent',
        locked ? 'border-white/10 opacity-50' : 'border-white/15',
        isActive
          ? 'border-lime/80 shadow-[0_0_12px_rgba(67,214,107,0.2)] ring-1 ring-lime/40'
          : '',
        scalePulse && isActive ? 'animate-pulseGlow' : '',
      ].join(' ')}
      whileTap={isActive && !disabled ? { scale: 0.97 } : undefined}
    >
      {isActive ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}

      <div className="relative z-[1] flex items-center justify-center py-0.5">
        <span className="rounded-full border border-white/10 bg-black/20 px-1.5 py-0 text-[8px] font-bold uppercase tracking-wide text-cloud">
          Day {reward.day}
        </span>
      </div>

      {locked ? (
        <LockIcon className="absolute right-1 top-6 h-3 w-3 text-slate/90 sm:right-2 sm:top-9 sm:h-5 sm:w-5" />
      ) : null}

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-0 pb-1 pt-0">
        <AssetGem className="h-5 w-5 drop-shadow-glow sm:h-7 sm:w-7" />
        <span className="rounded-lg border border-white/10 bg-royal/40 px-1.5 py-0 text-[10px] font-bold text-white tabular-nums sm:text-xs">
          {reward.value}
        </span>
      </div>

      {reward.claimed && reward.enabled ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/55">
          <span className="text-[9px] font-bold uppercase text-lime sm:text-xs">Claimed</span>
        </div>
      ) : missed ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/50">
          <span className="text-[9px] font-bold uppercase text-coral sm:text-xs">Missed</span>
        </div>
      ) : null}
    </motion.button>
  )
}

function BigDay7Card({
  reward,
  currentDay,
  scalePulse,
  onClaim,
  disabled,
}: {
  reward: DailyRewardRow
  currentDay: number
  scalePulse: boolean
  onClaim: (day: number) => void
  disabled: boolean
}) {
  const isActive = reward.day === currentDay && reward.enabled && !reward.claimed
  const missed = reward.enabled && !reward.claimed && reward.day < currentDay
  const locked = !reward.enabled

  return (
    <motion.button
      type="button"
      data-daily-card={reward.day}
      disabled={!isActive || disabled}
      onClick={() => isActive && onClaim(reward.day)}
      className={[
        'relative mt-0.5 flex min-h-[2.8rem] w-full flex-col overflow-hidden rounded-xl border p-1 text-center shadow-lg sm:min-h-[4.5rem] sm:rounded-2xl sm:p-1.5',
        'bg-gradient-to-b from-[#ffd66b]/[0.22] via-white/[0.07] to-transparent',
        locked ? 'border-white/10 opacity-50' : 'border-[#ffd66b]/35',
        isActive
          ? 'border-lime/80 shadow-[0_0_20px_rgba(67,214,107,0.25)] ring-2 ring-[#ffd66b]/45'
          : '',
        scalePulse && isActive ? 'animate-pulseGlow' : '',
      ].join(' ')}
      whileTap={isActive && !disabled ? { scale: 0.99 } : undefined}
    >
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(255,214,107,0.18)_0%,transparent_68%)]" />

      <div className="relative z-[1] flex items-center justify-center py-0.5 sm:py-1">
        <span className="rounded-full border border-[#ffd66b]/40 bg-black/30 px-2 py-0 text-[8px] font-bold uppercase tracking-wide text-[#ffd66b] sm:py-0.5 sm:text-xs">
          Day 7 bonus
        </span>
      </div>

      <div className="relative z-[1] flex flex-1 flex-row items-center justify-center gap-3 pb-1 pt-0 sm:gap-4">
        <AssetGem className="h-6 w-6 drop-shadow-[0_0_12px_rgba(255,214,107,0.45)] sm:h-9 sm:w-9" alt="" />
        <span className="rounded-xl border border-white/15 bg-royal/50 px-3 py-0.5 text-[10px] font-bold tabular-nums text-white sm:px-4 sm:py-1 sm:text-lg">
          {reward.value} gems
        </span>
      </div>

      {(reward.claimed && reward.enabled) || missed ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/55">
          <span className={`text-xs font-bold uppercase ${missed ? 'text-coral' : 'text-lime'}`}>
            {reward.claimed ? 'Claimed' : 'Missed'}
          </span>
        </div>
      ) : null}
    </motion.button>
  )
}

function FlyingGemsOverlay({ fly, onMotionFinished }: { fly: GemFly; onMotionFinished: () => void }) {
  const half = 18
  const done = useRef(0)
  const finished = useRef(false)
  const onDoneRef = useRef(onMotionFinished)
  onDoneRef.current = onMotionFinished

  const handleOneDone = () => {
    done.current += 1
    if (done.current >= 5 && !finished.current) {
      finished.current = true
      onDoneRef.current()
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute flex h-9 w-9 items-center justify-center"
          initial={{
            left: fly.from.x + fly.from.w / 2 - half,
            top: fly.from.y + fly.from.h / 2 - half,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            left: fly.to.x + fly.to.w / 2 - half + (i - 2) * 10,
            top: fly.to.y + fly.to.h / 2 - half - 10 - i * 8,
            opacity: 0.35,
            scale: 0.5,
          }}
          transition={{ duration: 0.72, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={handleOneDone}
        >
          <AssetGem className="h-full w-full drop-shadow-glow" alt="" />
        </motion.div>
      ))}
    </div>
  )
}

export default function DailyBonusModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch()
  const {
    rewards,
    currentDay,
    streakCount,
    daysClaimedList,
    dayStatus,
    totalGemsEarnedThisWeek,
    loading,
    claimInProgress,
    error,
    message,
    lastFetch,
  } = useAppSelector((s) => s.dailyRewards)
  const gems = useAppSelector((s) => s.shop.userBalance.gems)
  const authToken = useAppSelector((s) => s.auth.token)

  const gemsTargetRef = useRef<HTMLDivElement | null>(null)
  const [gemFly, setGemFly] = useState<GemFly | null>(null)
  const claimAfterFlyRef = useRef<(() => void) | null>(null)
  const [hasClaimedToday, setHasClaimedToday] = useState(false)
  const [dailyClaimCompleted, setDailyClaimCompleted] = useState(false)
  const [displayedGems, setDisplayedGems] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [claimLocalInProgress, setClaimLocalInProgress] = useState(false)
  const claimOnceRef = useRef(false)
  const [doubleSponsorOpen, setDoubleSponsorOpen] = useState(false)
  const doubleUpTimeoutRef = useRef<number | null>(null)
  const [doubleUsedToday, setDoubleUsedToday] = useState(false)

  useEffect(() => {
    if (!open) return
    try {
      setDoubleUsedToday(sessionStorage.getItem(getDailyDoubleStorageKey()) === '1')
    } catch {
      setDoubleUsedToday(false)
    }
  }, [open, hasClaimedToday])

  const displayRewards = useMemo(() => {
    if (lastFetch != null && rewards.length === 7) {
      const apiCurrentDay = currentDay
      const apiDaysClaimed = daysClaimedList
      const apiDayStatus = dayStatus ?? {}
      return defaultRewardsTemplate.map((template) => {
        const dayName = dayNumberToName[template.day]
        const isClaimedByArray = apiDaysClaimed.includes(template.day)
        const isClaimedByStatus = apiDayStatus[dayName] === true
        const apiClaimed = isClaimedByArray || isClaimedByStatus
        const isClaimed = apiClaimed || (hasClaimedToday && template.day === apiCurrentDay)
        const isEnabled = isClaimed || template.day <= apiCurrentDay
        return {
          ...template,
          claimed: isClaimed,
          enabled: isEnabled,
          isToday: template.day === apiCurrentDay,
        } satisfies DailyRewardRow
      })
    }
    return transformDailyLoginToRewards({ current_day: 1, days_claimed: [] }).map((r) => ({
      ...r,
      claimed: r.claimed || (hasClaimedToday && r.day === 1),
    }))
  }, [rewards, lastFetch, currentDay, daysClaimedList, dayStatus, hasClaimedToday])

  const currentDayReward = useMemo(() => displayRewards.find((r) => r.day === currentDay), [displayRewards, currentDay])
  const currentTotalGemsFromRewards = useMemo(() => displayRewards.filter((r) => r.claimed).reduce((s, r) => s + r.value, 0), [displayRewards])

  const canClaimToday = useMemo(() => {
    const todayReward = displayRewards.find((r) => r.day === currentDay)
    return !!(todayReward && todayReward.enabled && !todayReward.claimed && !hasClaimedToday && !dailyClaimCompleted && !claimInProgress && !claimLocalInProgress && isReady)
  }, [displayRewards, currentDay, hasClaimedToday, dailyClaimCompleted, claimInProgress, claimLocalInProgress, isReady])

  useEffect(() => {
    if (!open) return
    dispatch(clearDailyRewardsMessage())
    void dispatch(fetchDailyLoginStatus())
    void dispatch(fetchUserGems())
    setGemFly(null)
    setIsReady(false)
    setClaimLocalInProgress(false)
    const t = window.setTimeout(() => setIsReady(true), 80)
    return () => window.clearTimeout(t)
  }, [open, dispatch])

  useEffect(() => {
    if (!open || claimLocalInProgress || claimInProgress || gemFly) return
    const name = dayNumberToName[currentDay]
    const fromList = daysClaimedList.includes(currentDay)
    const fromStatus = dayStatus?.[name] === true
    const v = Boolean(fromList || fromStatus)
    setHasClaimedToday(v)
    setDailyClaimCompleted(v)
  }, [open, claimLocalInProgress, claimInProgress, gemFly, daysClaimedList, dayStatus, currentDay])

  useEffect(() => {
    if (!gemFly && !claimLocalInProgress) setDisplayedGems(gems)
  }, [gems, gemFly, claimLocalInProgress])

  const runClaimRequest = useCallback(async () => {
    if (claimOnceRef.current) return
    claimOnceRef.current = true
    try {
      await dispatch(claimDailyLoginReward()).unwrap()
      void dispatch(fetchUserGems())
    } catch {
      setHasClaimedToday(false)
      setDailyClaimCompleted(false)
    } finally {
      claimOnceRef.current = false
      setClaimLocalInProgress(false)
    }
  }, [dispatch])

  const handleClaim = useCallback((day: number) => {
    if (claimLocalInProgress || claimInProgress || Boolean(gemFly) || hasClaimedToday || dailyClaimCompleted || !isReady || !canClaimToday || loading) return
    if (day !== currentDay) return
    const reward = displayRewards.find((r) => r.day === day)
    if (!reward || !reward.enabled || reward.claimed) return
    setClaimLocalInProgress(true)
    setHasClaimedToday(true)
    setDailyClaimCompleted(true)
    const cardEl = document.querySelector(`[data-daily-card="${day}"]`) as HTMLElement | null
    const targetEl = gemsTargetRef.current
    void runClaimRequest()
    if (!cardEl || !targetEl) return
    const from = cardEl.getBoundingClientRect()
    const to = targetEl.getBoundingClientRect()
    setGemFly({
      from: { x: from.left, y: from.top, w: from.width, h: from.height },
      to: { x: to.left, y: to.top, w: to.width, h: to.height },
    })
    claimAfterFlyRef.current = () => {
      setGemFly(null)
      claimAfterFlyRef.current = null
    }
  }, [claimLocalInProgress, claimInProgress, gemFly, hasClaimedToday, dailyClaimCompleted, isReady, canClaimToday, loading, currentDay, displayRewards, runClaimRequest])

  const handleDoubleUp = useCallback(async () => {
    const bonus = currentDayReward?.value ?? 0
    if (bonus <= 0 || !authToken) return
    const apiRes = await apiService.claimDailyDoubleUp(authToken)
    if (apiRes.success) {
      try { sessionStorage.setItem(getDailyDoubleStorageKey(), '1') } catch { }
      setDoubleUsedToday(true)
      if (typeof apiRes.gems === 'number') {
        dispatch(setUserGemsBalance(apiRes.gems))
        setDisplayedGems(apiRes.gems)
      } else void dispatch(fetchUserGems())
      return
    }
    setDoubleSponsorOpen(true)
    if (doubleUpTimeoutRef.current) window.clearTimeout(doubleUpTimeoutRef.current)
    doubleUpTimeoutRef.current = window.setTimeout(() => {
      doubleUpTimeoutRef.current = null
      setDoubleSponsorOpen(false)
      try { sessionStorage.setItem(getDailyDoubleStorageKey(), '1') } catch { }
      setDoubleUsedToday(true)
      const next = gems + bonus
      dispatch(setUserGemsBalance(next))
      setDisplayedGems(next)
    }, 2500)
  }, [authToken, currentDayReward, dispatch, gems])

  const row1 = displayRewards.slice(0, 3)
  const row2 = displayRewards.slice(3, 6)
  const day7 = displayRewards[6]
  const busy = loading || claimInProgress || claimLocalInProgress || Boolean(gemFly) || !isReady || doubleSponsorOpen
  const canDoubleUp = !doubleUsedToday && Boolean(currentDayReward && currentDayReward.value > 0) && !claimInProgress && !claimLocalInProgress && !gemFly && isReady && Boolean(hasClaimedToday || dailyClaimCompleted)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {doubleSponsorOpen && (
            <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center backdrop-blur-sm">
              <p className="text-sm font-semibold text-[#ffd66b]">Sponsored message</p>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[#ffd66b]" />
            </div>
          )}
          {gemFly && <FlyingGemsOverlay fly={gemFly} onMotionFinished={() => claimAfterFlyRef.current?.()} />}
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={() => !busy && onClose()} />
          <motion.div
            className="scrollbar-hide relative z-[1] flex max-h-[min(95vh,606px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-quiz-panel text-white shadow-2xl sm:max-h-[min(90dvh,546px)] sm:rounded-3xl sm:max-w-md lg:max-w-sm"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }}
          >
            <div className="relative border-b border-white/10 px-4 pb-1.5 pt-3 text-center sm:pb-3 sm:pt-4">
              <h2 className="font-display text-base font-bold text-[#ffd66b] drop-shadow-glow sm:text-xl">Daily bonus</h2>
              <button type="button" disabled={busy} onClick={onClose} className="absolute right-2 top-2 p-2 text-cloud transition hover:bg-white/10 disabled:opacity-40 sm:right-3 sm:top-3">
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-2.5 sm:p-5">
              <div className="h-full origin-top scale-[0.85] sm:scale-100">
                <div ref={gemsTargetRef} className="-mt-1 mb-1.5 flex flex-row items-center justify-center gap-3 rounded-xl bg-white/5 px-4 py-1 sm:mb-2 sm:gap-5 sm:rounded-2xl sm:py-2">
                  <AssetDiamondsTotal className="h-10 w-10 sm:h-14 sm:w-14" />
                  <div className="text-left">
                    <p className="text-[10px] font-semibold text-cloud sm:text-xs">Your gems balance</p>
                    <p className="font-display text-lg font-black tabular-nums text-[#ffd66b] sm:text-2xl">{displayedGems}</p>
                  </div>
                </div>



                <div className="space-y-1.5 sm:space-y-2">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {row1.map(r => <RewardCard key={r.day} reward={r} currentDay={currentDay} scalePulse={canClaimToday} onClaim={handleClaim} disabled={busy} />)}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {row2.map(r => <RewardCard key={r.day} reward={r} currentDay={currentDay} scalePulse={canClaimToday} onClaim={handleClaim} disabled={busy} />)}
                  </div>
                  {day7 && <BigDay7Card reward={day7} currentDay={currentDay} scalePulse={canClaimToday} onClaim={handleClaim} disabled={busy} />}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 p-3 sm:p-5 text-center">
              <p className="mb-2 text-[9px] font-medium text-cloud sm:mb-3 sm:text-xs">
                {hasClaimedToday || dailyClaimCompleted ? 'Come back tomorrow for the next reward.' : 'Tap today’s card to claim reward.'}
              </p>
              <button type="button" disabled={!canDoubleUp} onClick={() => void handleDoubleUp()} className="w-full rounded-pill bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-2 text-[10px] font-bold text-[#7c4c00] transition hover:brightness-105 disabled:opacity-50 sm:py-3 sm:text-sm">
                Double your gems
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
