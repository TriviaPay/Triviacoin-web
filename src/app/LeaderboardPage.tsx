import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../store/store'
import { openChatWithPeerUserId, openModal, setLeaderboardTier, setReferralModalOpen, navigate } from '../store/uiSlice'
import { fetchLeaderboardData } from '../store/leaderboardSlice'
import type { LeaderboardRow } from '../store/leaderboardSlice'
import boyImg from '../assets/boy.jpg'
import girlImg from '../assets/girl.jpg'
import bronzeTabPng from '../assets/bronze.png'
import silverTabPng from '../assets/silver.png'
import tpcoinPng from '../assets/Tpcoin.png'
import { fetchNextDraw } from '../store/timerSlice'
import type { LeaderboardTier } from '../store/uiSlice'
import JoinChallengeModal from '../components/modals/JoinChallengeModal'
import LeaderboardUserModal from '../components/modals/LeaderboardUserModal'
import { fetchModesStatus } from '../store/triviaSlice'
import { fetchSubscriptionPlans } from '../store/subscriptionsSlice'
import { billableSubscriptionProductId } from '../utils/subscriptionTierPlan'
import { getModeInfo, modeAllowsPlay } from '../utils/triviaTierMeta'
import { startCheckout } from '../store/checkoutSlice'

const fallbackAvatars = [boyImg, girlImg, boyImg, girlImg]

/** Format draw date: America/New_York timezone, YYYY-MM-DD */
function getDrawDateForWinners(nextDrawTime: string | undefined): string {
  if (!nextDrawTime) {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  }
  const draw = new Date(nextDrawTime)
  const now = new Date()
  const nowDate = now.toISOString().slice(0, 10)
  if (now < draw) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return nowDate
}

const tabs: Array<{ key: LeaderboardTier; label: string; icon: string }> = [
  { key: 'bronze', label: 'Rookie', icon: bronzeTabPng },
  { key: 'silver', label: 'Scholar', icon: silverTabPng },
]

  const LeaderboardPage = () => {
  const dispatch = useAppDispatch()
  const tier = useAppSelector((s) => s.ui.leaderboardTier)
  const token = useAppSelector((s) => s.auth.token)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const modesStatus = useAppSelector((s) => s.trivia.modesStatus)
  const subscriptionPlans = useAppSelector((s) => s.subscriptions.plans)
  const currentUserId = useAppSelector((s) => {
    const u = s.auth.user as { account_id?: number; id?: number; user_id?: number } | null | undefined
    const id = u?.account_id ?? u?.id ?? u?.user_id
    return id != null ? Number(id) : null
  })
  const nextDrawTime = useAppSelector((s) => s.timer.nextDrawTime)
  const timerError = useAppSelector((s) => s.timer.error)
  const slot = useAppSelector((s) => s.leaderboard.slots[tier])
  const loadingTier = useAppSelector((s) => s.leaderboard.loadingTier)

  const [drawDate, setDrawDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [profileRow, setProfileRow] = useState<LeaderboardRow | null>(null)

  const entry = slot?.drawDate === drawDate ? slot : null
  const rows = entry?.rows ?? []
  const error = entry?.error ?? null
  const loading = loadingTier === tier && entry == null

  useEffect(() => {
    if (nextDrawTime) setDrawDate(getDrawDateForWinners(nextDrawTime))
  }, [nextDrawTime])

  useEffect(() => {
    if (!nextDrawTime && !timerError) {
      void dispatch(fetchNextDraw())
    }
  }, [dispatch, nextDrawTime, timerError])

  useEffect(() => {
    void dispatch(fetchSubscriptionPlans())
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchModesStatus())
    }
  }, [dispatch, isAuthenticated])

  useEffect(() => {
    void dispatch(
      fetchLeaderboardData({
        tier,
        drawDate,
        token,
        isAuthenticated,
      })
    )
  }, [dispatch, tier, drawDate, token, isAuthenticated])

  const refetch = (force?: boolean) => {
    void dispatch(
      fetchLeaderboardData({
        tier,
        drawDate,
        token,
        isAuthenticated,
        force,
      })
    )
  }

  const handleOpenReferral = () => {
    setJoinModalOpen(false)
    dispatch(setReferralModalOpen(true))
  }

  const tierIdx = tier === 'bronze' ? 1 : 2
  const isSubscribed = modeAllowsPlay(getModeInfo(tierIdx, modesStatus))
  const billableId = billableSubscriptionProductId(tierIdx, subscriptionPlans, modesStatus)

  const sendMessageToUser = (userId: number) => {
    if (!isAuthenticated) {
      dispatch(openModal('signin'))
      return
    }
    if (!Number.isFinite(userId) || userId <= 0) return
    if (currentUserId != null && userId === currentUserId) return
    setProfileRow(null)
    queueMicrotask(() => {
      dispatch(openChatWithPeerUserId(userId))
    })
  }

  return (
    <section className="section-card relative mx-auto w-full max-w-xl rounded-3xl bg-quiz-panel text-white sm:max-w-2xl md:max-w-3xl">
      <div className="mb-6 flex flex-col items-center gap-4">
        <h3 className="text-2xl sm:text-3xl font-display">Leaderboard</h3>
        <div className="mx-auto flex w-full max-w-[300px] items-center justify-center gap-2 rounded-full bg-white/10 p-1 sm:max-w-sm">
          {tabs.map((t) => {
            const active = t.key === tier
            return (
              <motion.button
                key={t.key}
                type="button"
                whileTap={{ scale: 0.96 }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold sm:gap-2 sm:px-4 ${
                  active ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00]' : 'text-white/80'
                }`}
                onClick={() => dispatch(setLeaderboardTier(t.key))}
              >
                <img src={t.icon} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-6 sm:w-6" />
                <span>{t.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="scrollbar-overlay mx-auto max-h-[55vh] min-h-[400px] w-full max-w-xl overflow-y-auto overflow-x-hidden px-1 sm:px-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-white/80">
            <p>{error}</p>
            {!isAuthenticated && error.includes('unavailable') && (
              <p className="mt-1 text-sm text-white/60">Sign in to view the leaderboard</p>
            )}
            <button
              type="button"
              onClick={() => refetch(true)}
              className="mt-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-white/70">No winners yet</div>
        ) : (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-1">
            {rows.map((row, idx) => {
              const isTop = idx < 3
              const fallback = fallbackAvatars[idx % fallbackAvatars.length]
              const avatarSrc =
                typeof row.avatar === 'string' ? row.avatar : (row.avatar as any)?.src ?? fallback
              return (
                <motion.div
                  key={`${row.id}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileRow(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setProfileRow(row)
                    }
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition hover:bg-white/[0.14] active:scale-[0.99] ${
                    isTop ? 'shadow-[0_12px_24px_rgba(255,214,107,0.25)]' : ''
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold tabular-nums">
                      {idx + 1}
                    </div>
                    <img
                      src={avatarSrc}
                      alt={row.name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                      onError={(e) => {
                        const fallbackImg = fallbackAvatars[idx % fallbackAvatars.length]
                        ;(e.target as HTMLImageElement).src =
                          typeof fallbackImg === 'string' ? fallbackImg : (fallbackImg as any)?.src ?? boyImg
                      }}
                    />
                    <span className="truncate font-semibold">{row.name}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 pl-2 font-display text-lg tabular-nums">
                    {row.score}
                    <img src={tpcoinPng} alt="" className="h-5 w-5 object-contain sm:h-6 sm:w-6" />
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        {!isSubscribed ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!isAuthenticated) {
                dispatch(openModal('signin'))
                return
              }
              if (!billableId) return
              const plan = subscriptionPlans.find((p) => p.productId === billableId)
              const priceStr = plan ? `$${(plan.priceMinor / 100).toFixed(2)}` : ''

              dispatch(
                startCheckout({
                  productId: billableId,
                  quantity: 1,
                  label: tierIdx === 1 ? 'Rookie Mode Subscription' : 'Scholar Mode Subscription',
                  paymentRoute: 'subscription',
                  cancelReturnPage: 'leaderboard',
                  price: priceStr,
                  iconUrl: tierIdx === 1 ? bronzeTabPng : silverTabPng,
                })
              )
              dispatch(navigate('checkout'))
            }}
            className="rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-6 py-2.5 text-base font-bold text-[#7c4c00] shadow-xl transition hover:brightness-110 sm:px-8 sm:py-3 sm:text-lg"
          >
            {tier === 'bronze' ? 'Subscribe to Rookie Mode' : 'Subscribe to Scholar Mode'}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => dispatch(setReferralModalOpen(true))}
            className="rounded-xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-6 py-2.5 text-base font-bold text-[#7c4c00] shadow-xl transition hover:brightness-110 sm:px-8 sm:py-3 sm:text-lg"
          >
            Refer a Friend
          </motion.button>
        )}
      </div>

      <JoinChallengeModal
        visible={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onRefer={handleOpenReferral}
      />

      <LeaderboardUserModal
        visible={profileRow != null}
        row={profileRow}
        drawDate={entry?.drawDate ?? drawDate}
        onClose={() => setProfileRow(null)}
        onSendMessage={sendMessageToUser}
        canSendMessage={
          isAuthenticated &&
          profileRow != null &&
          profileRow.userId > 0 &&
          (currentUserId == null || profileRow.userId !== currentUserId)
        }
        isSelf={profileRow != null && currentUserId != null && profileRow.userId === currentUserId}
        isAuthenticated={isAuthenticated}
      />
    </section>
  )
}

export default LeaderboardPage
