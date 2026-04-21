import { useEffect, useState, useRef, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../store/store'
import { startCheckout } from '../store/checkoutSlice'
import { navigate, openModal, setActiveModeName, setGameIndex } from '../store/uiSlice'
import { fetchModesStatus } from '../store/triviaSlice'
import { fetchSubscriptionPlans } from '../store/subscriptionsSlice'
import Button from '../components/ui/Button'
import InfoTooltip from '../components/ui/InfoTooltip'
import TriviaChallengePanel, { type TriviaPlayMode } from '../components/trivia/TriviaChallengePanel'
import type { ModesStatusResponse } from '../lib/triviaApi'
import { billableSubscriptionProductId } from '../utils/subscriptionTierPlan'
import {
  buildTierMeta,
  getModeInfo,
  modeAllowsPlay,
} from '../utils/triviaTierMeta'
import bronzeBadge from '../assets/bronze.png'
import silverBadge from '../assets/silver.png'
import goldBadge from '../assets/gold.png'
import diamondBadge from '../assets/diamond1.png'
import lockPng from '../assets/lock.png'
import tpcoinPng from '../assets/Tpcoin.png'

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true })
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

const modes = [
  { name: 'Free', color: 'from-[#4ade80] to-[#16a34a]', tier: 'free' as const },
  { name: 'Rookie', color: 'from-[#60a5fa] to-[#2563eb]', tier: 'bronze' as const, badge: bronzeBadge },
  { name: 'Scholar', color: 'from-[#a78bfa] to-[#7c3aed]', tier: 'silver' as const, badge: silverBadge },
  { name: 'Master', color: 'from-[#fb923c] to-[#f97316]', tier: 'gold' as const, badge: goldBadge, locked: true, comingSoon: true },
  { name: 'Genius', color: 'from-[#facc15] to-[#eab308]', tier: 'platinum' as const, badge: diamondBadge, locked: true, comingSoon: true },
  { name: 'Unlimited', color: 'from-[#f43f5e] to-[#be123c]', tier: 'platinum' as const, locked: true, comingSoon: true },
]

function indexToPlayMode(idx: number): TriviaPlayMode | null {
  if (idx === 0) return 'free'
  if (idx === 1) return 'bronze'
  if (idx === 2) return 'silver'
  if (idx === 3) return 'gold'
  if (idx === 4) return 'platinum'
  return null
}



type TierCta = 'play' | 'subscribe' | 'signin' | 'loading'

/** Paid tiers: Play if API grants access, else Subscribe (navigate to checkout for Stripe / PayPal). */
function resolveTierCta(idx: number, ms: ModesStatusResponse | null, isAuthed: boolean): TierCta {
  if (idx === 0) return 'play'
  if (!isAuthed) return 'signin'
  if (idx >= 1 && idx <= 4) {
    if (!ms) return 'loading'
    const info = getModeInfo(idx, ms)
    if (modeAllowsPlay(info)) return 'play'
    return 'subscribe'
  }
  return 'play'
}

const DailyChallenges = () => {
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.ui.selectedGameIndex)
  const auth = useAppSelector((s) => s.auth)
  const modesStatus = useAppSelector((s) => s.trivia.modesStatus)
  const { bronzePrizePool, silverPrizePool } = useAppSelector((s) => s.timer)
  const subscriptionPlans = useAppSelector((s) => s.subscriptions.plans)
  const subscriptionsLoading = useAppSelector((s) => s.subscriptions.loading)
  const vw = useViewportWidth()

  const slidePx = Math.round(Math.min(Math.max(vw * 0.08, 16), 46))
  const rotateDeg = vw < 480 ? 1.5 : vw < 768 ? 2.5 : 4
  const inactiveScale = vw < 400 ? 0.82 : vw < 640 ? 0.85 : 0.9

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [playMode, setPlayMode] = useState<TriviaPlayMode | null>(null)
  const [playTierIndex, setPlayTierIndex] = useState<number | null>(null)
  const [autoSlide, setAutoSlide] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (vw >= 1024 || !scrollerRef.current) return
    const scroller = scrollerRef.current
    const cardWidth = vw < 640 ? Math.min(window.innerWidth * 0.88, 280) : 224 // matches card w-[min(88vw,17.5rem)] vs sm:w-56 (224px)
    const gap = vw < 640 ? 12 : 20 // matches flex gap-3 vs sm:gap-5
    
    // Calculate targeted scrollLeft to center the card
    const scrollAmount = active * (cardWidth + gap)
    scroller.scrollTo({ left: scrollAmount, behavior: 'smooth' })
  }, [active, vw])

  useEffect(() => {
    void dispatch(fetchSubscriptionPlans())
  }, [dispatch])

  useEffect(() => {
    if (!auth.isAuthenticated) return
    void dispatch(fetchModesStatus())
  }, [auth.isAuthenticated, dispatch])

  useEffect(() => {
    setFlipped(false)
  }, [active])

  const checkAccess = (idx: number): boolean => {
    if (idx === 0) return true
    return modeAllowsPlay(getModeInfo(idx, modesStatus))
  }

  useEffect(() => {
    if (!autoSlide) return undefined
    let current = active
    const id = window.setInterval(() => {
      current = (current + 1) % modes.length
      dispatch(setGameIndex(current))
    }, 3200)
    return () => window.clearInterval(id)
  }, [dispatch, active, autoSlide])

  const change = (dir: number) => {
    const next = (active + dir + modes.length) % modes.length
    dispatch(setGameIndex(next))
  }

  const onTouchStart = (e: TouchEvent) => setTouchStart(e.touches[0].clientX)
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStart == null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (delta > 40) change(-1)
    if (delta < -40) change(1)
    setTouchStart(null)
  }

  const startPlay = (idx: number) => {
    const mode = indexToPlayMode(idx)
    if (!mode) return
    if (!checkAccess(idx)) return
    if (!auth.isAuthenticated) {
      dispatch(openModal('signin'))
      return
    }
    setAutoSlide(false)
    dispatch(setGameIndex(idx))
    dispatch(setActiveModeName(modes[idx].name))
    setPlayTierIndex(idx)
    setPlayMode(mode)
  }

  return (
    <section className="section-card relative overflow-hidden rounded-3xl bg-quiz-panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-display text-white sm:text-3xl">Trivia Challenge</h3>
          <InfoTooltip content={
            <div className="space-y-2">
              <p>Each game has 10 questions, 30s each, no skips. Pick from Free up to $20 modes.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Answer fast for streak bonuses.</li>
                <li>Rewards scale with entry amount.</li>
                <li>Progress is saved per mode.</li>
              </ul>
            </div>
          } />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="px-3 py-2" onClick={() => change(-1)}>
            ←
          </Button>
          <Button variant="ghost" className="px-3 py-2" onClick={() => change(1)}>
            →
          </Button>
        </div>
      </div>

      {subscriptionsLoading && subscriptionPlans.length === 0 ? (
        <p className="mb-3 text-center text-sm text-white/60">Loading subscription plans…</p>
      ) : null}
      {!subscriptionsLoading && subscriptionPlans.length === 0 ? (
        <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-100/90">
          Could not load the subscription catalog. Tier pricing may fall back to your account status only.
        </p>
      ) : null}

      <div className="relative -mx-5 px-5 sm:mx-0 sm:px-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div 
          ref={scrollerRef}
          className="flex items-center gap-3 overflow-x-auto overflow-y-visible pb-8 pt-2 snap-x snap-mandatory scrollbar-none sm:gap-5 md:justify-center md:overflow-x-visible px-[20%] sm:px-0"
        >
          {modes.map((card, idx) => {
            const offset = idx - active
            const isActive = idx === active
            const z = isActive ? 50 : 20 - Math.abs(offset)
            const scale = isActive ? 1.05 : inactiveScale
            const rotate = offset * rotateDeg
            const info = getModeInfo(idx, modesStatus)
            const cta = resolveTierCta(idx, modesStatus, auth.isAuthenticated)
            const statusMessage = info?.message?.trim()
            const billableId =
              idx >= 1 ? billableSubscriptionProductId(idx, subscriptionPlans, modesStatus) : null
            const planTitle = card.name
            const checkoutLabel = `${planTitle} Subscription`
            const currentPrizePool = idx === 1 ? bronzePrizePool : idx === 2 ? silverPrizePool : 0
            const prizePoolLabel = currentPrizePool > 0
              ? currentPrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : ''
            
            const isLockedOrComing = card.locked || card.comingSoon
            const isExpired = statusMessage?.toLowerCase().includes('expired')

            return (
              <motion.div
                key={card.name}
                className="flex w-[min(88vw,17.5rem)] max-w-[min(88vw,17.5rem)] shrink-0 snap-center cursor-pointer flex-col items-stretch sm:w-64 sm:max-w-none md:w-56 lg:w-56"
                style={{ zIndex: z }}
                animate={{
                  scale,
                  rotate,
                  opacity: vw < 1024 ? (isActive ? 1 : 0) : (isLockedOrComing ? 0.5 : 1),
                  x: vw < 1024 ? 0 : offset * slidePx,
                }}
                transition={{ type: 'spring', stiffness: vw < 1024 ? 140 : 120, damping: vw < 1024 ? 16 : 12 }}
                onClick={() => {
                  if (!isActive) {
                    dispatch(setGameIndex(idx))
                    return
                  }
                  if (isLockedOrComing) return
                  setFlipped((f) => !f)
                }}
              >
                <div 
                  className={`relative h-[13.5rem] min-h-[13.5rem] snap-center rounded-3xl border ${isActive ? 'border-[#ffd66b] shadow-[0_0_25px_rgba(255,214,107,0.3)]' : 'border-white/15'} p-4 text-center shadow-[0_16px_30px_rgba(0,0,0,0.25)] perspective-1000 sm:h-56 sm:min-h-[14rem] transition-colors duration-300`}
                >
                  {isActive && !isLockedOrComing && (
                    <div className="absolute right-4 top-4 z-[30] pointer-events-none opacity-80">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 16h5v5" />
                      </svg>
                    </div>
                  )}
                  <motion.div
                    className={`absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-b ${card.color} p-3 text-white backface-hidden sm:p-4`}
                    animate={{ rotateY: flipped && isActive && !isLockedOrComing ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <h4 className="font-display text-xl leading-tight sm:text-2xl">{planTitle}</h4>
                    {/* Prize pool label moved to badge section */}
                    {idx === 0 && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-100/90">Free Access</p>
                    )}
                    {info?.task_completed && (
                      <p className="mt-1 text-[11px] font-black text-white drop-shadow-md uppercase tracking-wider">Challenge Complete</p>
                    )}
                    
                    {isLockedOrComing && (
                      <div className="absolute top-2 right-2 flex items-center justify-center">
                        <div>
                          <img src={lockPng} alt="Locked" className="h-6 w-6 sm:h-8 sm:w-8 object-contain opacity-90" />
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex-1 flex flex-col items-center justify-center gap-2">
                      <div className="flex flex-col items-center gap-2 pt-2">
                        {card.badge && (
                           <img 
                             src={card.badge} 
                             alt="" 
                             className={`object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] ${
                               idx === 4 
                                 ? 'h-14 w-14 sm:h-20 sm:w-20' 
                                 : 'h-10 w-10 sm:h-14 sm:w-14'
                             }`} 
                           />
                        )}
                        {prizePoolLabel ? (
                          <div className="mt-1 flex flex-col items-center justify-center gap-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Prize Pool</span>
                            <div className="flex items-center gap-1.5 px-1 py-0.5">
                              <span className="text-xs font-black text-[#ffd66b] sm:text-sm whitespace-nowrap drop-shadow-sm">{prizePoolLabel}</span>
                              <img src={tpcoinPng} alt="" className="h-4 w-4 sm:h-5 sm:w-5 object-contain" />
                            </div>
                          </div>
                        ) : null}
                      </div>

                    </div>
                    {card.comingSoon ? (
                      <Button className="mt-3 w-full py-2.5 text-sm font-black uppercase tracking-[0.05em] shadow-lg" disabled>
                        Coming Soon
                      </Button>
                    ) : cta === 'subscribe' || isExpired ? (
                      <div className="mt-auto pt-3">
                        <Button
                          className="w-full py-2.5 text-sm font-bold shadow-lg"
                          disabled={!billableId}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!billableId) return
                            const plan = subscriptionPlans.find(p => p.productId === billableId)
                            // Pricing overrides as requested
                            let price = plan ? plan.priceMinor / 100 : undefined
                            if (idx === 1) price = 5.00
                            if (idx === 2) price = 10.00
                            const label = `${card.name} Subscription`
                            dispatch(
                              startCheckout({
                                productId: billableId,
                                quantity: 1,
                                label,
                                paymentRoute: 'subscription',
                                cancelReturnPage: 'daily',
                                iconUrl: card.badge,
                                price,
                              }),
                            )
                            dispatch(navigate('checkout'))
                          }}
                        >
                          {isExpired ? 'Renew Now' : 'Subscribe'}
                        </Button>
                      </div>
                    ) : cta === 'loading' ? (
                      <div className="mt-auto pt-3">
                        <Button className="w-full py-2.5 text-sm" disabled>
                          Loading…
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-auto pt-3">
                        <Button
                          className="w-full py-2.5 text-sm font-bold shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (cta === 'signin') {
                              dispatch(openModal('signin'))
                              return
                            }
                            if (isExpired) {
                              // If expired, trigger checkout instead of play
                              const plan = subscriptionPlans.find(p => p.productId === billableId)
                              let price = plan ? plan.priceMinor / 100 : undefined
                              if (idx === 2) price = 10.00
                              dispatch(
                                startCheckout({
                                  productId: billableId!,
                                  quantity: 1,
                                  label: `${card.name} Subscription`,
                                  paymentRoute: 'subscription',
                                  cancelReturnPage: 'daily',
                                  iconUrl: card.badge,
                                  price,
                                }),
                              )
                              dispatch(navigate('checkout'))
                              return
                            }
                            startPlay(idx)
                          }}
                        >
                          {cta === 'signin' ? 'Sign in' : 'Play'}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-[#0b2a6c] p-3 text-white backface-hidden sm:p-4"
                    style={{ rotateY: 180 }}
                    animate={{ rotateY: flipped && isActive ? 360 : 180 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                      <p className="text-sm font-black uppercase tracking-widest text-[#ffd66b] drop-shadow-sm">Description</p>
                      <p className="mt-2 text-[14px] font-bold leading-relaxed text-white drop-shadow-md">
                        {idx === 0 
                          ? "Learn and level up skills"
                          : idx === 5
                            ? "Unlimited question and higher the rewards"
                            : "Daily drop one question daily challenge first come higher rewards"}
                      </p>
                    </div>
                    <p className="mt-2 shrink-0 text-center text-[10px] font-black uppercase tracking-tighter text-[#ffd66b]/80">
                      Tap card to go back
                    </p>
                  </motion.div>
                </div>
                {statusMessage && !isExpired ? (
                  <p className="mt-2 px-1 text-center text-[11px] leading-snug text-white/70 sm:text-xs">{statusMessage}</p>
                ) : isExpired ? (
                   <p className="mt-2 px-1 text-center text-[11px] leading-snug text-red-300 font-bold sm:text-xs">Subscription expired. Tap Play to renew!</p>
                ) : null}
              </motion.div>
            )
          })}
        </div>
      </div>

      {playMode != null && playTierIndex != null ? (
        <div className="relative mt-6 flex min-h-[min(44vh,360px)] flex-col rounded-2xl border border-white/10 bg-black/15 sm:min-h-[min(48vh,400px)]">
          <TriviaChallengePanel
            mode={playMode}
            overlayPosition="panel"
            useHomeQuizLayout
            tierMeta={buildTierMeta(playTierIndex, modesStatus)}
            onBack={() => {
              setPlayMode(null)
              setPlayTierIndex(null)
              dispatch(fetchModesStatus({ force: true }))
            }}
          />
        </div>
      ) : null}

      {!auth.isAuthenticated ? (
        <p className="mt-4 text-center text-sm text-white/70">
          Tap <span className="font-semibold text-white/90">Play</span> on Free to sign in, or sign in on paid cards to subscribe and unlock $5–$20 modes.
        </p>
      ) : null}
    </section>
  )
}

export default DailyChallenges
