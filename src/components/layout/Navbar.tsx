import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import triviaLogoPng from '../../assets/triviaLogo.png'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { logout, patchUser, setUserProfileMedia } from '../../store/authSlice'
import { useDescope } from '@descope/react-sdk'
import { openModal, navigate } from '../../store/uiSlice'
import type { Page } from '../../store/uiSlice'
import { apiService } from '../../services/apiService'
import { setChatStatus } from '../../store/uiSlice'
import { resolveProfileDisplayMedia } from '../../utils/profileDisplayMedia'
import ChatAvatar from '../chat/ChatAvatar'
import { subscribe as subscribeNotifications, syncFromApi } from '../../services/notificationService'
import { useOnboarding } from '../Onboarding/OnboardingContext'
import LogoutConfirmModal from '../modals/LogoutConfirmModal'
import CloseIcon from '../ui/CloseIcon'

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

function LogoutIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  )
}

const Navbar = ({ onStart: _onStart }: Props) => {
  const { startTour } = useOnboarding()
  const descope = useDescope()
  const dispatch = useAppDispatch()
  const current = useAppSelector((s) => s.ui.currentPage)
  const { isAuthenticated, token, user } = useAppSelector((s) => s.auth)
  const { gems, tpcoins } = useAppSelector((s) => s.shop.userBalance)
  const chatStatus = useAppSelector((s) => s.ui.chatStatus)
  const [open, setOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
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
      /* optional: drive badge refresh */
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
        const m = res.metadata
        dispatch(
          setChatStatus({
            unreadMessages: Number.isFinite(m.unread) ? m.unread : 0,
            unreadGlobal: Number.isFinite(m.unreadGlobal) ? m.unreadGlobal : 0,
            unreadPrivate: Number.isFinite(m.unreadPrivate) ? m.unreadPrivate : 0,
            friendRequests: Number.isFinite(m.requests) ? m.requests : 0,
            onlineCount: Number.isFinite(m.online) ? m.online : 0,
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

  const performLogout = async () => {
    setLogoutConfirmOpen(false)
    setOpen(false)
    try {
      if ((descope as { logout?: () => Promise<unknown> })?.logout) {
        try {
          await (descope as { logout: () => Promise<unknown> }).logout()
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    dispatch(logout())
    dispatch(navigate('home'))
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <header className="fixed left-0 right-0 top-0 z-20 w-full font-sans">
      <div className="w-full bg-[#1e40af] shadow-lg shadow-black/25 border-b border-[#0b2a6c]">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-[clamp(0.875rem,2vw,1.75rem)] py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.15)] sm:h-11 sm:w-11">
              <img src={triviaLogoPng} alt="" className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
            </div>
            <div className="type-display min-w-0 truncate sm:whitespace-normal">Trivia Coin</div>
          </div>

          <nav className="hidden min-w-0 flex-wrap items-center justify-center gap-3 font-semibold text-white md:flex lg:gap-4 xl:gap-5">
            <button
              type="button"
              onClick={() => startTour({ force: true })}
              className="type-nav text-white/70 hover:text-[#ffd66b]"
            >
              Tour
            </button>
            {menuItems.map((item) => {
              const active = current === item.page
              return (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className={`type-nav relative min-w-0 ${active ? 'text-[#ffd66b] drop-shadow-glow' : ''}`}
                  onClick={() => dispatch(navigate(item.page))}
                >
                  {item.label}
                  {item.page === 'chats' && (chatStatus.unreadMessages > 0 || chatStatus.friendRequests > 0) && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-fluid-2xs font-bold text-white shadow-sm ring-1 ring-white/20">
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
                  <span className="text-fluid-sm font-black text-white tabular-nums tracking-tighter">
                    {gems.toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <img src={tpcoinPng} alt="TPCoins" className="h-5 w-5 object-contain drop-shadow-glow" />
                  <span className="text-fluid-sm font-black text-[#ffd66b] tabular-nums tracking-tighter">
                    {tpcoins.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}

            {isAuthenticated ? (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center p-2 text-white/90 transition hover:text-[#ffd66b]"
                onClick={() => setLogoutConfirmOpen(true)}
                aria-label="Log out"
                title="Log out"
              >
                <LogoutIcon className="h-6 w-6" />
              </motion.button>
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
                className="px-5 py-2 text-fluid-sm sm:px-6 sm:py-2.5 rounded-full"
                onClick={() => dispatch(openModal('signin'))}
              >
                Sign In
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:hidden sm:gap-2">
            {(isAuthenticated && current !== 'home') ? (
              <div className="flex max-w-[9rem] items-center gap-2 px-2 py-1.5 rounded-xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md xs:max-w-none xs:gap-3 xs:px-3">
                <div className="flex min-w-0 items-center gap-1 xs:gap-1.5">
                  <img src={gemPng} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  <span className="truncate text-fluid-xs font-black text-white tabular-nums">{gems.toLocaleString()}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1 xs:gap-1.5">
                  <img src={tpcoinPng} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  <span className="truncate text-fluid-xs font-black text-[#ffd66b] tabular-nums">{tpcoins.toLocaleString()}</span>
                </div>
              </div>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                className="touch-target flex items-center justify-center p-2 text-white/90 hover:text-[#ffd66b]"
                onClick={() => setLogoutConfirmOpen(true)}
                aria-label="Log out"
                title="Log out"
              >
                <LogoutIcon className="h-6 w-6" />
              </button>
            ) : null}
            <button
              className="touch-target rounded-lg text-white"
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
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-40 flex w-[min(18rem,88vw)] max-w-[88vw] flex-col space-y-3 overflow-y-auto overscroll-contain bg-[#0b2a6c] p-4 shadow-[-12px_0_30px_rgba(0,0,0,0.35)] sm:space-y-4 sm:p-6 md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
            >
            <button
              type="button"
              className="touch-target self-end rounded-lg p-1.5 transition hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={() => {
                startTour({ force: true })
                setOpen(false)
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-left type-nav-mobile text-[#ffd66b]"
            >
              Replay welcome tour
            </button>
            {menuItems.map((item) => {
              const active = current === item.page
              return (
                <button
                  key={item.label}
                  className={`type-nav-mobile relative w-full rounded-xl px-4 py-3 text-left font-semibold ${active ? 'bg-white/15 text-[#ffd66b]' : 'bg-white/10 text-white'}`}
                  onClick={() => {
                    dispatch(navigate(item.page))
                    setOpen(false)
                  }}
                >
                  {item.label}
                  {item.page === 'chats' && (chatStatus.unreadMessages > 0 || chatStatus.friendRequests > 0) && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-fluid-2xs font-bold text-white shadow-sm ring-1 ring-white/20">
                      {chatStatus.unreadMessages + chatStatus.friendRequests}
                    </span>
                  )}
                </button>
              )
            })}
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setLogoutConfirmOpen(true)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-semibold text-white"
                >
                  <LogoutIcon className="h-5 w-5" />
                  Log out
                </button>
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
              </>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => dispatch(openModal('signin'))}>
                Sign In
              </Button>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => void performLogout()}
      />

    </header>
  )
}

export default Navbar
