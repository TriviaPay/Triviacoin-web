import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppNotification } from '../../services/notificationService'
import {
  clearAll,
  markAllAsRead,
  markAsRead,
  removeNotification,
  subscribe,
  syncFromApi,
} from '../../services/notificationService'
import NotificationItem from './NotificationItem'

function formatNotifTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(ts)
}

type Props = {
  open: boolean
  onClose: () => void
  token: string | null
  isDark?: boolean
}

export default function NotificationsDrawer({ open, onClose, token, isDark = true }: Props) {
  const [list, setList] = useState<AppNotification[]>([])

  useEffect(() => {
    return subscribe(setList)
  }, [])

  useEffect(() => {
    if (open && token) {
      void syncFromApi(token)
    }
  }, [open, token])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const unread = useMemo(() => list.filter((n) => !n.read).length, [list])
  const hasUnread = unread > 0

  const onMarkRead = useCallback(
    (id: string) => {
      void markAsRead(token, id)
    },
    [token],
  )

  const onDelete = useCallback(
    (id: string) => {
      void removeNotification(token, id)
    },
    [token],
  )

  const onMarkAll = useCallback(() => {
    void markAllAsRead(token)
  }, [token])

  const onDeleteAll = useCallback(() => {
    void clearAll(token)
  }, [token])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close notifications backdrop"
            className="fixed inset-0 z-[115] bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-drawer-title"
            className="fixed right-0 top-0 z-[116] flex h-[100dvh] w-full max-w-[min(100vw,420px)] flex-col border-l border-white/15 bg-quiz-panel shadow-[-8px_0_32px_rgba(0,0,0,0.4)] sm:max-w-md"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex min-w-0 items-center gap-2">
                <h2 id="notifications-drawer-title" className="font-display text-lg font-bold text-white sm:text-xl">
                  Notifications
                </h2>
                <span className="shrink-0 rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-2 py-0.5 text-xs font-bold text-[#5d3a00] tabular-nums shadow-sm">
                  {unread}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {list.length > 0 ? (
              <div className="flex shrink-0 flex-col gap-2 border-b border-white/5 px-3 py-2 sm:flex-row sm:px-4">
                {hasUnread ? (
                  <button
                    type="button"
                    onClick={onMarkAll}
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm font-medium text-cloud transition hover:bg-white/10"
                  >
                    <span aria-hidden>✓</span> Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onDeleteAll}
                  className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-coral transition hover:bg-red-500/15"
                >
                  Delete all
                </button>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
              {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <div className="mb-4 text-5xl opacity-90" aria-hidden>
                    🔔
                  </div>
                  <p className="text-sm text-cloud sm:text-base">No notifications yet</p>
                  <p className="mt-2 max-w-xs text-xs text-white/55 sm:text-sm">
                    Alerts about draws, rewards, and messages will show up here.
                  </p>
                </div>
              ) : (
                list.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    timeLabel={formatNotifTime(item.timestamp)}
                    onPress={() => onMarkRead(item.id)}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
