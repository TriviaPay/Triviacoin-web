import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { navigate, openChatWithPeerUserId, openModal } from '../../store/uiSlice'
import { apiService } from '../../services/apiService'
import ChatAvatar from '../chat/ChatAvatar'
import tpcoinPng from '../../assets/Tpcoin.png'

export type HomeWinner = {
  id: string
  name: string
  image: string
  prize: string
  timestamp: number
  userId: number | null
}

function formatRelative(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  return `${Math.floor(days / 7)} weeks ago`
}

const CACHE_KEY = 'trivia_recent_winners_v1'
const CACHE_MS = 5 * 60 * 1000

export default function WinnersCarousel() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const user = useAppSelector((s) => s.auth.user)
  const [winners, setWinners] = useState<HomeWinner[]>([])
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { t, list } = JSON.parse(raw) as { t: number; list: HomeWinner[] }
        if (Array.isArray(list) && Date.now() - t < CACHE_MS) {
          setWinners(list)
          setLoading(false)
        }
      }
    } catch {
      /* ignore */
    }

    setLoading(true)
    // Guests: `null` → fetchWithAuth sends X-Device-UUID only (backend allows this route).
    const res = await apiService.getRecentWinners(token ?? null)
    if (!res.success || !res.data) {
      setLoading(false)
      if (!sessionStorage.getItem(CACHE_KEY)) setWinners([])
      return
    }
    const d = res.data as Record<string, unknown>
    const rawList = (Array.isArray(d.winners) ? d.winners : Array.isArray(d) ? d : null) as Record<
      string,
      unknown
    >[] | null
    const mapped: HomeWinner[] = (rawList ?? []).map((w, i) => {
      const username = String(w.username ?? w.name ?? 'Player')
      const amount =
        typeof w.money_awarded === 'number'
          ? w.money_awarded
          : typeof w.amount_won === 'number'
            ? w.amount_won
            : Number(w.amount ?? w.prize ?? 0)
      const uidRaw = w.user_id ?? w.userid ?? w.account_id
      const userId =
        typeof uidRaw === 'number' && Number.isFinite(uidRaw)
          ? uidRaw
          : typeof uidRaw === 'string' && /^\d+$/.test(uidRaw)
            ? Number(uidRaw)
            : null
      const id = String(w.id ?? userId ?? i)
      const submitted =
        String(w.submitted_at ?? w.date ?? w.created_at ?? w.draw_date ?? '') || new Date().toISOString()
      const pType = String(w.profile_pic_type ?? '')
      const profilePic =
        (w.profile_pic_url as string | null) ||
        (w.profile_pic as string | null) ||
        (w.profilePic as string | null) ||
        null
      const avUrl = (w.avatar_url as string | null) || null
      let image: string
      if (pType === 'custom' && profilePic) image = profilePic
      else if (pType === 'avatar' && avUrl) image = avUrl
      else image = profilePic || avUrl || ''
      if (!image) {
        image = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7c3aed&color=fff&size=128`
      }
      return {
        id,
        name: username,
        image,
        prize: (typeof amount === 'number' && !isNaN(amount) ? amount : 0).toFixed(2),
        timestamp: new Date(submitted).getTime(),
        userId,
      }
    })
    setWinners(mapped)
    setLoading(false)
    setSlide(0)
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), list: mapped }))
    } catch {
      /* ignore */
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (winners.length <= 1) return
    const t = window.setInterval(() => {
      setSlide((s) => (s + 1) % winners.length)
    }, 4000)
    return () => clearInterval(t)
  }, [winners.length])

  const current = winners[slide] ?? null

  const dots = useMemo(() => {
    const n = Math.min(winners.length, 4)
    return Array.from({ length: n }, (_, i) => i === slide % n)
  }, [winners.length, slide])

  const onWinnerClick = (w: HomeWinner) => {
    if (!token) {
      dispatch(openModal('signin'))
      return
    }
    if (w.userId != null && w.userId > 0) {
      dispatch(openChatWithPeerUserId(w.userId))
    }
  }

  if (loading && winners.length === 0) {
    return (
      <div className="mt-8 flex w-full justify-center sm:mt-10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-[#ffd66b]" />
      </div>
    )
  }

  if (winners.length === 0) {
    return (
      <div className="relative mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#4c1d95]/40 to-black/30 p-6 text-center shadow-inner sm:mt-10 sm:max-w-lg">
        <h3 className="font-display text-lg font-bold text-[#ffd66b]">Recent winners</h3>
        <p className="mt-2 text-sm text-cloud">No winners to show yet — it could be you tomorrow.</p>
        <button
          type="button"
          onClick={() => dispatch(navigate('leaderboard'))}
          className="mt-4 rounded-full bg-gradient-to-b from-[#ffd66b] to-[#f3a011] px-5 py-2 text-xs font-bold text-[#7c4c00] shadow-glow"
        >
          View leaderboard
        </button>
      </div>
    )
  }

  return (
    <div className="relative mx-auto mt-8 flex w-full max-w-5xl flex-col items-center justify-center gap-6 md:flex-row md:items-stretch sm:mt-10" data-tour="tour-winners">
      {/* Congratulations Card */}
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#1e40af]/50 via-[#1e3a8a]/40 to-black/35 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:max-w-lg flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[#ffd66b] sm:text-base">
            Your Winnings
          </h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          {user?.recent_draw_earnings && user.recent_draw_earnings > 0 ? (
            <>
              <h4 className="font-display text-xl font-bold text-white sm:text-2xl">Congratulations,</h4>
              <p className="text-sm text-white/80 sm:text-base">
                today you won <span className="font-black text-[#ffd66b] drop-shadow-glow">{user.recent_draw_earnings} TC</span>
              </p>
            </>
          ) : (
            <>
              <h4 className="font-display text-xl font-bold text-white sm:text-2xl">Keep Playing!</h4>
              <p className="text-sm text-white/80 sm:text-base">
                Your next big win is just a quiz away. Challenge yourself and climb the leaderboard!
              </p>
            </>
          )}
        </div>
      </div>

      {/* Recent Winners Card */}
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#312e81]/50 via-[#1e1b4b]/40 to-black/35 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:max-w-lg flex flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[#ffd66b] sm:text-base">
            Recent winners
          </h3>
          <button
            type="button"
            onClick={() => dispatch(navigate('leaderboard'))}
            className="text-xs font-semibold text-white/80 underline decoration-[#ffd66b]/60 underline-offset-2 hover:text-white"
          >
            View all
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {current ? (
            <button
              type="button"
              onClick={() => onWinnerClick(current)}
              className="flex w-full justify-center p-6 transition hover:bg-white/[0.04]"
            >
              <div className="flex max-w-md flex-row items-center gap-3 text-center sm:gap-4 sm:text-left">
                <ChatAvatar
                  avatarUrl={current.image}
                  alt={current.name}
                  size={64}
                  variant="rounded"
                  className="shrink-0 shadow-none ring-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-white sm:text-lg">{current.name}</p>
                  <p className="text-xs text-white/65 sm:text-sm">{formatRelative(current.timestamp)}</p>
                  <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
                    <img src={tpcoinPng} alt="" className="h-4 w-4 opacity-90 sm:h-5 sm:w-5" />
                    <span className="text-sm font-bold tabular-nums text-white sm:text-base">{current.prize}</span>
                  </div>
                </div>
              </div>
            </button>
          ) : null}
        </div>

        {winners.length > 1 ? (
          <div className="flex shrink-0 justify-center gap-1.5 pb-4 pt-1">
            {dots.map((on, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-white' : 'bg-white/35'}`}
              />
            ))}
          </div>
        ) : (
          <div className="pb-4" />
        )}
      </div>
    </div>
  )
}
