import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../store/store'
import { subscribe as subscribeNotifications, unreadCount as getUnreadCount } from '../../services/notificationService'
import NotificationsDrawer from '../notifications/NotificationsDrawer'
import DailyBonusModal from '../daily/DailyBonusModal'
import gemPng from '../../assets/diamond.png'
import tpcoinPng from '../../assets/Tpcoin.png'

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 7V3H9v1.5L7.5 3 6 4.5V3H3v4h18V3h-3v1.5L16.5 3 15 4.5V3h-3v4H12zm-9 2v12h18V9H3zm2 2h14v8H5v-8z" />
    </svg>
  )
}

export default function HomeActionIcons() {
  const { isAuthenticated, token } = useAppSelector((s) => s.auth)
  const { gems, tpcoins } = useAppSelector((s) => s.shop.userBalance)
  const [dailyBonusOpen, setDailyBonusOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifUnread, setNotifUnread] = useState(0)

  useEffect(() => {
    setNotifUnread(getUnreadCount())
    return subscribeNotifications(() => {
      setNotifUnread(getUnreadCount())
    })
  }, [])

  if (!isAuthenticated) return null

  return (
    <div className="mb-6 flex w-full items-center justify-end">
      {/* Unified Action & Balance Section - Full Width */}
      <div className="flex w-full items-center justify-between rounded-2xl bg-quiz-panel border border-white/10 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-2">
        
        {/* Balances Area - Prominent on left */}
        <div className="flex items-center gap-3 px-4 py-2 sm:gap-6 sm:px-8">
          <div className="flex items-center gap-2">
            <img src={gemPng} alt="Gems" className="h-5 w-5 object-contain drop-shadow-glow sm:h-6 sm:w-6" />
            <span className="text-sm font-black text-white tabular-nums tracking-tighter sm:text-base">
              {gems.toLocaleString()}
            </span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <img src={tpcoinPng} alt="TPCoins" className="h-5 w-5 object-contain drop-shadow-glow sm:h-6 sm:w-6" />
            <span className="text-sm font-black text-[#ffd66b] tabular-nums tracking-tighter sm:text-base">
              {(tpcoins ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons Group - Right Aligned, Transparent by Default */}
        <div className="flex items-center">
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-all sm:h-14 sm:w-14"
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <BellIcon className="h-6 w-6 drop-shadow-glow sm:h-7 sm:w-7" />
            {notifUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-tr from-red-500 to-rose-400 px-1 text-[10px] font-black text-white ring-2 ring-[#0b2a6c] shadow-lg">
                {notifUnread > 9 ? '9+' : notifUnread}
              </span>
            )}
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#ffd66b] transition-all sm:h-14 sm:w-14"
            onClick={() => setDailyBonusOpen(true)}
            aria-label="Daily Bonus"
          >
            <GiftIcon className="h-6 w-6 drop-shadow-glow sm:h-7 sm:w-7" />
          </motion.button>
        </div>
      </div>

      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} token={token} />
      <DailyBonusModal open={dailyBonusOpen} onClose={() => setDailyBonusOpen(false)} />
    </div>
  )
}
