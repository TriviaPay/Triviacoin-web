import Button from '../ui/Button'
import type { LeaderboardRow } from '../../store/leaderboardSlice'

type Props = {
  visible: boolean
  row: LeaderboardRow | null
  drawDate: string | null
  onClose: () => void
  onSendMessage: (userId: number) => void
  canSendMessage: boolean
  isSelf: boolean
  isAuthenticated: boolean
}

function isImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  if (/\.json(\?|$)/i.test(url)) return false
  return /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url) || url.includes('amazonaws.com')
}

function parseLevelProgress(progress: string | null | undefined): { current: number; max: number; pct: number } {
  if (!progress || typeof progress !== 'string') return { current: 0, max: 100, pct: 0 }
  const m = progress.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (!m) return { current: 0, max: 100, pct: 0 }
  const cur = Number(m[1])
  const max = Math.max(1, Number(m[2]))
  const pct = Math.min(100, Math.max(0, Math.round((cur / max) * 100)))
  return { current: cur, max, pct }
}

const LeaderboardUserModal = ({
  visible,
  row,
  drawDate,
  onClose,
  onSendMessage,
  canSendMessage,
  isSelf,
  isAuthenticated,
}: Props) => {
  if (!visible || !row) return null

  const uid = Number(row.userId ?? row.id)
  const displayAvatar = row.profilePic && isImageUrl(row.profilePic) ? row.profilePic : row.avatar
  const mainBadge = row.badgeImageUrl && isImageUrl(row.badgeImageUrl) ? row.badgeImageUrl : null
  const { pct } = parseLevelProgress(row.levelProgress ?? null)

  const badges = Array.isArray(row.subscriptionBadges) ? row.subscriptionBadges : []
  const badgeUrls = badges
    .map((b) => {
      if (typeof b === 'string') return b
      if (b && typeof b === 'object') {
        const o = b as { url?: string; image_url?: string }
        return o.url ?? o.image_url ?? ''
      }
      return ''
    })
    .filter((u): u is string => typeof u === 'string' && u.length > 0 && isImageUrl(u))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-user-title"
    >
      <div
        className="relative max-h-[88vh] w-full max-w-[320px] overflow-y-auto rounded-xl border-2 border-[#ffd66b]/50 bg-gradient-to-b from-[#1a4fc4] via-[#143d9e] to-[#0b2a6c] p-4 text-white shadow-[0_24px_48px_rgba(0,0,0,0.45)] sm:max-w-sm sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 transition hover:bg-white/10"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            {row.frameUrl && isImageUrl(row.frameUrl) ? (
              <div className="relative h-28 w-28">
                <img src={displayAvatar} alt="" className="h-full w-full rounded-full object-cover ring-2 ring-[#ffd66b]/60" />
                <img src={row.frameUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              </div>
            ) : (
              <img
                src={displayAvatar}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-2 ring-[#ffd66b]/40 ring-offset-2 ring-offset-[#0b2a6c] sm:h-24 sm:w-24"
              />
            )}
            {typeof row.position === 'number' ? (
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[11px] font-bold text-[#5c3800] shadow-lg sm:h-9 sm:w-9 sm:text-xs">
                {row.position}
              </span>
            ) : null}
          </div>

          <h3 id="lb-user-title" className="font-display text-center text-2xl font-bold text-[#ffd66b]">
            {row.name}
          </h3>

          {drawDate ? (
            <p className="text-center text-xs text-white/65">
              Draw{' '}
              <span className="font-semibold text-[#a8d4ff]">{drawDate}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-white/15 bg-white/[0.06] p-4">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Winnings</span>
            <span className="font-display font-bold text-[#ffd66b] tabular-nums">
              {typeof row.moneyAwarded === 'number' ? row.moneyAwarded.toLocaleString() : row.score}
            </span>
          </div>
          {row.dateWon ? (
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Date won</span>
              <span className="text-cloud">{row.dateWon}</span>
            </div>
          ) : null}
          {row.submittedAt ? (
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Submitted</span>
              <span className="text-right text-xs text-cloud">
                {new Date(row.submittedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          ) : null}

          <div className="border-t border-white/10 pt-3">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-white/70">Level {row.level != null ? row.level : '—'}</span>
              <span className="text-xs text-[#a8d4ff]">{row.levelProgress ?? ''}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34d399] via-[#ffd66b] to-[#f472b6] transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {mainBadge ? (
            <div className="flex items-center gap-3 border-t border-white/10 pt-3">
              <span className="text-sm text-white/70">Badge</span>
              <img src={mainBadge} alt="" className="h-10 w-10 rounded-lg object-contain" />
            </div>
          ) : null}

          {badgeUrls.length > 0 ? (
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-sm text-white/70">Subscription badges</p>
              <div className="flex flex-wrap gap-2">
                {badgeUrls.map((url, i) => (
                  <img key={`${url}-${i}`} src={url} alt="" className="h-9 w-9 rounded-md object-contain ring-1 ring-white/20" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {canSendMessage && !isSelf ? (
            <Button
              className="w-full flex-1 py-3 text-sm font-bold uppercase"
              onClick={() => {
                if (Number.isFinite(uid) && uid > 0) onSendMessage(uid)
              }}
            >
              Send message
            </Button>
          ) : null}
          {isSelf ? <p className="text-center text-sm text-white/60">This is you</p> : null}
          {!isAuthenticated ? (
            <p className="text-center text-sm text-white/60">Sign in to message players</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default LeaderboardUserModal
