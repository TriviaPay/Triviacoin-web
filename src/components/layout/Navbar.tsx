import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import triviaLogoPng from '../../assets/triviaLogo.png'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { patchUser, setUserProfileMedia } from '../../store/authSlice'
import { openModal, navigate } from '../../store/uiSlice'
import type { Page } from '../../store/uiSlice'
import { apiService } from '../../services/apiService'
import { setChatStatus } from '../../store/uiSlice'
import { resolveProfileDisplayMedia } from '../../utils/profileDisplayMedia'
import ChatAvatar from '../chat/ChatAvatar'
import DailyBonusModal from '../daily/DailyBonusModal'
import NotificationsDrawer from '../notifications/NotificationsDrawer'
import { subscribe as subscribeNotifications, syncFromApi, unreadCount as getUnreadCount } from '../../services/notificationService'
import { useOnboarding } from '../Onboarding/OnboardingContext'

import gemPng from '../../assets/diamond.png'
import tpcoinPng from '../../assets/Tpcoin.png'
import { setUserBalances } from '../../store/shopSlice'



type Props = {
  onStart?: () => void
}

const menuItems: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Trivia Challenge', page: 'daily' },
  { label: 'Leaderboard', page: 'leaderboard' },
  { label: 'Wallet', page: 'wallet' },
  { label: 'Shop', page: 'shop' },
  { label: 'Chats', page: 'chats' },
  { label: 'Settings', page: 'settings' },
]

const Navbar = ({ onStart: _onStart }: Props) => {
  const { startTour } = useOnboarding()
  const dispatch = useAppDispatch()
  const current = useAppSelector((s) => s.ui.currentPage)
  const { isAuthenticated, token, user } = useAppSelector((s) => s.auth)
  const { gems, tpcoins } = useAppSelector((s) => s.shop.userBalance)
  const chatStatus = useAppSelector((s) => s.ui.chatStatus)
  const [open, setOpen] = useState(false)
  /** Token we have successfully refreshed navbar avatar media for (profile summary can lag). */
  const profileMediaOkForToken = useRef<string | null>(null)
  /** Avoid repeating notification sync on every render/navigation; drawer open still syncs separately. */
  const notifBootstrappedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      profileMediaOkForToken.current = null
      return
    }
    if (profileMediaOkForToken.current === token) return

    let cancelled = false

    const apply = (res: Awaited<ReturnType<typeof apiService.fetchProfileSummary>>) => {
      if (cancelled || !res.success || !res.data) return
      const d = res.data as Record<string, unknown>
      const un = typeof d.username === 'string' ? d.username.trim() : ''
      if (un) dispatch(patchUser({
        username: un,
        subscription_type: d.subscription_type as string | null,
        subscription_badges: Array.isArray(d.subscription_badges) ? d.subscription_badges : null,
      }))
      dispatch(setUserProfileMedia(resolveProfileDisplayMedia(d)))
      dispatch(setUserBalances({
        gems: typeof d.total_gems === 'number' ? d.total_gems : undefined,
        tpcoins: typeof d.total_trivia_coins === 'number' ? d.total_trivia_coins : undefined,
      }))
      profileMediaOkForToken.current = token
    }

    void apiService.fetchProfileSummary(token).then(apply)
    const retryMs = 2200
    const t = window.setTimeout(() => {
      if (cancelled || profileMediaOkForToken.current === token) return
      void apiService.fetchProfileSummary(token).then(apply)
    }, retryMs)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [isAuthenticated, token, dispatch])

  useEffect(() => {
    return subscribeNotifications(() => {
      // getUnreadCount() or similar logic
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      notifBootstrappedFor.current = null
      return
    }
    if (notifBootstrappedFor.current === token) return
    notifBootstrappedFor.current = token
    void syncFromApi(token)
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!isAuthenticated || !token) return
    let cancelled = false
    const fetchChatStatus = async () => {
      const res = await apiService.getGlobalChatMessages(token, 1)
      if (!cancelled && res.success && res.metadata) {
        dispatch(
          setChatStatus({
            unreadMessages: res.metadata.unread_messages_count ?? 0,
            friendRequests: res.metadata.friend_requests_count ?? 0,
            onlineCount: res.metadata.online_count ?? 0,
          })
        )
      }
    }
    fetchChatStatus()
    const id = setInterval(fetchChatStatus, 20000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAuthenticated, token, dispatch, current])

  return (
    <header className="fixed left-0 right-0 top-0 z-20 w-full font-sans">
      <div className="w-full bg-[#1e40af] shadow-lg shadow-black/25 border-b border-[#0b2a6c]">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.15)]">
              <img src={triviaLogoPng} alt="" className="h-9 w-9 object-contain" />
            </div>
            <div className="font-display text-2xl font-bold text-white drop-shadow-glow">Trivia Coin</div>
          </div>

          <nav className="hidden items-center gap-6 font-semibold text-white lg:gap-8 md:flex">
            <button
              type="button"
              onClick={() => startTour({ force: true })}
              className="text-xs font-bold uppercase tracking-wide text-white/70 hover:text-[#ffd66b]"
            >
              Tour
            </button>
            {menuItems.map((item) => {
              const active = current === item.page
              return (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className={`relative text-sm tracking-wide ${active ? 'text-[#ffd66b] drop-shadow-glow' : ''}`}
                  onClick={() => dispatch(navigate(item.page))}
                >
                  {item.label}
                  {item.page === 'chats' && (chatStatus.unreadMessages > 0 || chatStatus.friendRequests > 0) && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/20">
                      {chatStatus.unreadMessages + chatStatus.friendRequests}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </nav>

          <div className="hidden md:flex md:items-center md:gap-3">
            {(isAuthenticated && current !== 'home') ? (
              <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <img src={gemPng} alt="Gems" className="h-5 w-5 object-contain drop-shadow-glow" />
                  <span className="text-sm font-black text-white tabular-nums tracking-tighter">
                    {gems.toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <img src={tpcoinPng} alt="TPCoins" className="h-5 w-5 object-contain drop-shadow-glow" />
                  <span className="text-sm font-black text-[#ffd66b] tabular-nums tracking-tighter">
                    {tpcoins.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}

            {isAuthenticated ? (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                className="flex items-center justify-center rounded-full p-1.5 bg-white/10 text-white border border-white/20 shadow-lg"
                onClick={() => dispatch(navigate('profile'))}
                aria-label="Open profile"
                title="Profile"
              >
                <span className="relative flex items-center justify-center shrink-0 overflow-hidden rounded-full ring-2 ring-white/25">
                  <ChatAvatar
                    avatarUrl={user?.avatarUrl ?? null}
                    profilePic={user?.profilePicUrl ?? null}
                    alt={user?.username || user?.email || 'Profile'}
                    size={36}
                  />
                </span>
              </motion.button>
            ) : (
              <Button
                variant="primary"
                className="px-6 py-2.5 text-sm rounded-full"
                onClick={() => dispatch(openModal('signin'))}
              >
                Sign In
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden sm:gap-3">
            {(isAuthenticated && current !== 'home') ? (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <img src={gemPng} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-[11px] font-black text-white tabular-nums">{gems.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src={tpcoinPng} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-[11px] font-black text-[#ffd66b] tabular-nums">{tpcoins.toLocaleString()}</span>
                </div>
              </div>
            ) : null}
            <button
              className="text-white p-1"
              aria-label="Toggle menu"
              onClick={() => setOpen((o) => !o)}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-y-0 right-0 z-30 flex w-[min(18rem,88vw)] max-w-[88vw] flex-col space-y-4 bg-[#0b2a6c] p-4 shadow-[ -12px_0_30px_rgba(0,0,0,0.35)] sm:p-6 md:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
          >
            <button className="self-end text-white text-xl" onClick={() => setOpen(false)}>
              ✕
            </button>
            <button
              type="button"
              onClick={() => {
                startTour({ force: true })
                setOpen(false)
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-[#ffd66b]"
            >
              Replay welcome tour
            </button>
            {menuItems.map((item) => {
              const active = current === item.page
              return (
                <button
                  key={item.label}
                  className={`relative w-full rounded-xl px-4 py-3 text-left font-semibold ${active ? 'bg-white/15 text-[#ffd66b]' : 'bg-white/10 text-white'}`}
                  onClick={() => {
                    dispatch(navigate(item.page))
                    setOpen(false)
                  }}
                >
                  {item.label}
                  {item.page === 'chats' && (chatStatus.unreadMessages > 0 || chatStatus.friendRequests > 0) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                      {chatStatus.unreadMessages + chatStatus.friendRequests}
                    </span>
                  )}
                </button>
              )
            })}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => { dispatch(navigate('profile')); setOpen(false); }}
                className="w-full flex items-center justify-center rounded-xl px-4 py-3 font-semibold bg-white/15 text-white"
                aria-label="Open profile"
                title="Profile"
              >
                <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/25">
                  <ChatAvatar
                    avatarUrl={user?.avatarUrl ?? null}
                    profilePic={user?.profilePicUrl ?? null}
                    alt={user?.username || user?.email || 'Profile'}
                    size={40}
                  />
                </span>
              </button>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => dispatch(openModal('signin'))}>
                Sign In
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  )
}

export default Navbar
