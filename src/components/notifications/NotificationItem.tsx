import { memo } from 'react'
import type { AppNotification } from '../../services/notificationService'
import { getNotificationColor, getNotificationIcon } from '../../lib/notifications/notificationUtils'

type Props = {
  item: AppNotification
  isDark: boolean
  timeLabel: string
  onPress: () => void
  onDelete?: (id: string) => void
}

function NotificationItemInner({ item, isDark, timeLabel, onPress, onDelete }: Props) {
  const accent = getNotificationColor(item.type, isDark)
  const icon = getNotificationIcon(item.type)

  return (
    <div
      className="mb-3 flex w-full overflow-hidden rounded-xl border border-white/15 bg-white/[0.05] text-left shadow-sm transition hover:bg-white/[0.08]"
      style={{
        borderLeftWidth: item.read ? undefined : 4,
        borderLeftColor: item.read ? undefined : accent,
        opacity: item.read ? 0.82 : 1,
      }}
    >
      <button
        type="button"
        onClick={onPress}
        className="flex min-w-0 flex-1 items-stretch gap-3 p-3 text-left sm:gap-3.5 sm:p-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd66b]/70"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11"
          style={{ backgroundColor: `${accent}33` }}
        >
          <span className="text-lg leading-none sm:text-xl" aria-hidden>
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
            <span className="font-display text-sm font-bold text-white sm:text-base">{item.title}</span>
            <span className="shrink-0 text-[10px] text-white/55 tabular-nums sm:text-xs">{timeLabel}</span>
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-snug text-white/70 sm:text-sm">{item.message}</p>
        </div>
      </button>
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-stretch border-l border-white/5 px-1.5 py-2 sm:px-2">
        {!item.read ? (
          <span className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5" style={{ backgroundColor: accent }} aria-hidden />
        ) : (
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5" aria-hidden />
        )}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white/90"
            aria-label="Remove notification"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default memo(NotificationItemInner)
