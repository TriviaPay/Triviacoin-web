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
        'relative flex min-h-[7rem] flex-col overflow-hidden rounded-2xl border p-2 text-left shadow-lg transition sm:min-h-[8.25rem]',
        'bg-gradient-to-b from-white/[0.08] to-transparent',
        locked ? 'border-white/10 opacity-50' : 'border-white/15',
        isActive
          ? 'border-lime/80 shadow-[0_0_20px_rgba(67,214,107,0.25)] ring-1 ring-lime/40'
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

      <div className="relative z-[1] flex items-center justify-center py-1">
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cloud sm:text-xs">
          Day {reward.day}
        </span>
      </div>

      {locked ? (
        <LockIcon className="absolute right-1.5 top-8 h-4 w-4 text-slate/90 sm:right-2 sm:top-9 sm:h-5 sm:w-5" />
      ) : null}

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-1 pb-1 pt-0">
        <AssetGem className="h-9 w-9 drop-shadow-glow sm:h-11 sm:w-11" />
        <span className="rounded-lg border border-white/10 bg-royal/40 px-2 py-0.5 text-base font-bold text-white tabular-nums sm:text-lg">
          {reward.value}
        </span>
      </div>

      {reward.claimed && reward.enabled ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/55">
          <span className="text-[10px] font-bold uppercase text-lime sm:text-xs">Claimed</span>
        </div>
      ) : missed ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/50">
          <span className="text-[10px] font-bold uppercase text-coral sm:text-xs">Missed</span>
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
        'relative mt-1 flex min-h-[10.5rem] w-full flex-col overflow-hidden rounded-2xl border p-3 text-center shadow-lg sm:min-h-[11.5rem] sm:p-4',
        'bg-gradient-to-b from-[#ffd66b]/[0.22] via-white/[0.07] to-transparent',
        locked ? 'border-white/10 opacity-50' : 'border-[#ffd66b]/35',
        isActive
          ? 'border-lime/80 shadow-[0_0_28px_rgba(67,214,107,0.32)] ring-2 ring-[#ffd66b]/45'
          : '',
        scalePulse && isActive ? 'animate-pulseGlow' : '',
      ].join(' ')}
      whileTap={isActive && !disabled ? { scale: 0.99 } : undefined}
    >
      {isActive ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/22 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(255,214,107,0.28)_0%,transparent_68%)]" />

      <div className="relative z-[1] flex items-center justify-center py-1">
        <span className="rounded-full border border-[#ffd66b]/40 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ffd66b] sm:text-xs">
          Day 7 bonus
        </span>
      </div>

      {locked ? (
        <LockIcon className="absolute right-2 top-8 h-5 w-5 text-slate/90 sm:right-3 sm:top-9" />
      ) : null}

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2 pb-1 pt-1">
        <AssetGem className="h-14 w-14 drop-shadow-[0_0_16px_rgba(255,214,107,0.55)] sm:h-[4.5rem] sm:w-[4.5rem]" alt="" />
        <span className="rounded-xl border border-white/15 bg-royal/50 px-4 py-1.5 text-xl font-bold tabular-nums text-white sm:text-2xl">
          {reward.value} gems
        </span>
      </div>

      {reward.claimed && reward.enabled ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/55">
          <span className="text-xs font-bold uppercase text-lime">Claimed</span>
        </div>
      ) : missed ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-midnight/50">
          <span className="text-xs font-bold uppercase text-coral">Missed</span>
        </div>
      ) : null}
    </motion.button>
  )
}

function FlyingGemsOverlay({
  fly,
  onMotionFinished,
}: {
  fly: GemFly
  onMotionFinished: () => void
}) {
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
          transition={{
            duration: 0.72,
            delay: i * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
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
    if (Array.isArray(rewards) && rewards.length === 7) {
      const fallbackCurrentDay = currentDay || 1
      return [...rewards]
        .sort((a, b) => a.day - b.day)
        .map((r) => ({
          ...r,
          claimed: r.claimed || (hasClaimedToday && r.day === fallbackCurrentDay),
        }))
    }
    return transformDailyLoginToRewards({
      current_day: 1,
      days_claimed: [],
    }).map((r) => ({
      ...r,
      claimed: r.claimed || (hasClaimedToday && r.day === 1),
    }))
  }, [rewards, lastFetch, currentDay, daysClaimedList, dayStatus, hasClaimedToday])

  const apiCurrentDay = currentDay
  const currentDayReward = useMemo(
    () => displayRewards.find((r) => r.day === apiCurrentDay),
    [displayRewards, apiCurrentDay]
  )

  const currentTotalGemsFromRewards = useMemo(
    () => displayRewards.filter((r) => r.claimed).reduce((s, r) => s + r.value, 0),
    [displayRewards]
  )

  const canClaimToday = useMemo(() => {
    const todayReward = displayRewards.find((r) => r.day === apiCurrentDay)
    return !!(
      todayReward &&
      todayReward.enabled &&
      !todayReward.claimed &&
      !hasClaimedToday &&
      !dailyClaimCompleted &&
      !claimInProgress &&
      !claimLocalInProgress &&
      isReady
    )
  }, [
    displayRewards,
    apiCurrentDay,
    hasClaimedToday,
    dailyClaimCompleted,
    claimInProgress,
    claimLocalInProgress,
    isReady,
  ])

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
  }, [
    open,
    claimLocalInProgress,
    claimInProgress,
    gemFly,
    daysClaimedList,
    dayStatus,
    currentDay,
  ])

  useEffect(() => {
    if (!gemFly && !claimLocalInProgress) {
      setDisplayedGems(gems)
    }
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

  const handleClaim = useCallback(
    (day: number) => {
      if (
        claimLocalInProgress ||
        claimInProgress ||
        Boolean(gemFly) ||
        hasClaimedToday ||
        dailyClaimCompleted ||
        !isReady ||
        !canClaimToday ||
        loading
      ) {
        return
      }
      const apiDay = currentDay
      if (day !== apiDay) return
      const reward = displayRewards.find((r) => r.day === day)
      if (!reward || !reward.enabled || reward.claimed) return

      setClaimLocalInProgress(true)
      setHasClaimedToday(true)
      setDailyClaimCompleted(true)

      const cardEl = document.querySelector(`[data-daily-card="${day}"]`) as HTMLElement | null
      const targetEl = gemsTargetRef.current
      
      void runClaimRequest()

      if (!cardEl || !targetEl) {
        return
      }

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
    },
    [
      claimLocalInProgress,
      claimInProgress,
      gemFly,
      hasClaimedToday,
      dailyClaimCompleted,
      isReady,
      canClaimToday,
      loading,
      currentDay,
      displayRewards,
      runClaimRequest,
    ]
  )

  const onAllGemsMotionDone = useCallback(() => {
    claimAfterFlyRef.current?.()
  }, [])

  useEffect(() => {
    if (!gemFly) return
    const t = window.setTimeout(() => {
      claimAfterFlyRef.current?.()
    }, 2400)
    return () => window.clearTimeout(t)
  }, [gemFly])

  const addGemsThisClaim = currentDayReward?.value ?? 0
  useEffect(() => {
    if (message && !message.includes('already') && hasClaimedToday && addGemsThisClaim > 0) {
      setDisplayedGems((prev) => Math.max(prev, gems, prev + addGemsThisClaim))
    }
  }, [message, hasClaimedToday, addGemsThisClaim, gems])

  const busy =
    loading || claimInProgress || claimLocalInProgress || Boolean(gemFly) || !isReady || doubleSponsorOpen

  const canDoubleUp =
    !doubleUsedToday &&
    Boolean(currentDayReward && currentDayReward.value > 0) &&
    !claimInProgress &&
    !claimLocalInProgress &&
    !gemFly &&
    isReady &&
    Boolean(hasClaimedToday || dailyClaimCompleted)

  const handleDoubleUp = useCallback(async () => {
    if (!canDoubleUp || !authToken) return
    const bonus = currentDayReward?.value ?? 0
    if (bonus <= 0) return

    const apiRes = await apiService.claimDailyDoubleUp(authToken)
    if (apiRes.success) {
      try {
        sessionStorage.setItem(getDailyDoubleStorageKey(), '1')
      } catch {
        /* ignore */
      }
      setDoubleUsedToday(true)
      if (typeof apiRes.gems === 'number') {
        dispatch(setUserGemsBalance(apiRes.gems))
        setDisplayedGems(apiRes.gems)
      } else {
        void dispatch(fetchUserGems())
      }
      return
    }

    setDoubleSponsorOpen(true)
    if (doubleUpTimeoutRef.current) window.clearTimeout(doubleUpTimeoutRef.current)
    doubleUpTimeoutRef.current = window.setTimeout(() => {
      doubleUpTimeoutRef.current = null
      setDoubleSponsorOpen(false)
      try {
        sessionStorage.setItem(getDailyDoubleStorageKey(), '1')
      } catch {
        /* ignore */
      }
      setDoubleUsedToday(true)
      const next = gems + bonus
      dispatch(setUserGemsBalance(next))
      setDisplayedGems(next)
    }, 2500)
  }, [canDoubleUp, authToken, currentDayReward, dispatch, gems])

  useEffect(() => {
    return () => {
      if (doubleUpTimeoutRef.current) window.clearTimeout(doubleUpTimeoutRef.current)
    }
  }, [])

  const row1 = displayRewards.slice(0, 3)
  const row2 = displayRewards.slice(3, 6)
  const day7 = displayRewards[6]

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
          {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-bonus-title"
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {doubleSponsorOpen ? (
            <div
              className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-[#ffd66b]">Sponsored message</p>
              <p className="max-w-sm text-sm text-cloud">Thanks for supporting Trivia Coin.</p>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[#ffd66b]" />
            </div>
          ) : null}
          {gemFly ? <FlyingGemsOverlay fly={gemFly} onMotionFinished={onAllGemsMotionDone} /> : null}

          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
            aria-label="Close daily bonus"
            onClick={() => !busy && onClose()}
          />

          <motion.div
            className={[
              'scrollbar-hide relative z-[1] flex max-h-[min(92vh,880px)] w-full flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-white/15',
              'bg-quiz-panel text-white shadow-[0_16px_32px_rgba(0,0,0,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
              'sm:max-h-[min(90dvh,840px)] sm:rounded-3xl',
              'max-w-[100%] sm:max-w-md lg:max-w-lg',
            ].join(' ')}
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="relative border-b border-white/10 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
              <h2
                id="daily-bonus-title"
                className="text-center font-display text-xl font-bold tracking-tight text-[#ffd66b] drop-shadow-glow sm:text-2xl md:text-3xl"
              >
                Daily bonus
              </h2>
              <p className="mt-1 text-center text-xs text-cloud/90 sm:text-sm">Claim your streak rewards</p>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="absolute right-2 top-2 rounded-full p-2 text-cloud transition hover:bg-white/10 disabled:opacity-40 sm:right-3 sm:top-3"
                aria-label="Close"
              >
                <span className="text-2xl leading-none text-white">×</span>
              </button>
            </div>

            <div className="space-y-3 px-3 pb-5 pt-3 sm:space-y-4 sm:px-5 sm:pb-6 sm:pt-4">
              <div
                ref={gemsTargetRef}
                data-gems-balance-target
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-4 text-center sm:px-4 sm:py-5"
              >
                <AssetDiamondsTotal className="h-11 w-11 sm:h-14 sm:w-14" alt="" />
                <div>
                  <p className="text-xs text-cloud sm:text-sm">Your gems</p>
                  <p className="font-display text-xl font-bold tabular-nums text-[#ffd66b] sm:text-2xl md:text-3xl">
                    {displayedGems}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-cloud sm:text-sm">
                <span>
                  Streak: <strong className="text-white tabular-nums">{streakCount}</strong> days
                </span>
                {totalGemsEarnedThisWeek != null ? (
                  <span>
                    This week:{' '}
                    <strong className="text-[#ffd66b] tabular-nums">{totalGemsEarnedThisWeek}</strong> gems
                  </span>
                ) : (
                  <span className="text-cloud/80">
                    Week progress:{' '}
                    <strong className="text-white tabular-nums">{currentTotalGemsFromRewards}</strong> gems
                  </span>
                )}
              </div>

              {error ? (
                <p className="rounded-2xl border border-coral/40 bg-coral/10 px-3 py-2 text-center text-sm text-cloud">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded-2xl border border-lime/35 bg-lime/10 px-3 py-2 text-center text-sm text-cloud">
                  {message}
                </p>
              ) : null}

              {loading && displayRewards.length === 0 ? (
                <div className="flex justify-center py-10">
                  <span
                    className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-azure"
                    aria-label="Loading"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {row1.map((r) => (
                      <RewardCard
                        key={r.day}
                        reward={r}
                        currentDay={currentDay}
                        scalePulse={canClaimToday}
                        onClaim={handleClaim}
                        disabled={busy}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {row2.map((r) => (
                      <RewardCard
                        key={r.day}
                        reward={r}
                        currentDay={currentDay}
                        scalePulse={canClaimToday}
                        onClaim={handleClaim}
                        disabled={busy}
                      />
                    ))}
                  </div>
                  {day7 ? (
                    <BigDay7Card
                      reward={day7}
                      currentDay={currentDay}
                      scalePulse={canClaimToday}
                      onClaim={handleClaim}
                      disabled={busy}
                    />
                  ) : null}
                </>
              )}

              <p className="px-1 text-center text-xs font-medium leading-snug text-cloud sm:text-sm">
                {hasClaimedToday || dailyClaimCompleted
                  ? doubleUsedToday
                    ? 'Reward claimed — doubled with today’s bonus. Come back tomorrow.'
                    : canDoubleUp
                      ? 'Double your gems after a short sponsor message (or when your server adds a double-up API).'
                      : 'Reward claimed! Come back tomorrow.'
                  : canClaimToday
                    ? 'Tap today’s card to claim your reward, then you can double up.'
                    : message?.includes('already')
                      ? 'Come back tomorrow for the next reward.'
                      : 'Check back when the next day unlocks.'}
              </p>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  disabled={!canDoubleUp}
                  onClick={() => void handleDoubleUp()}
                  className="w-full max-w-sm rounded-pill bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-5 py-3 text-sm font-display font-bold text-[#7c4c00] shadow-glow transition hover:brightness-105 disabled:opacity-50 sm:py-3.5"
                >
                  Double up gems
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
