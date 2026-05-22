import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { navigate, openChatWithPeerUserId, openModal } from '../../store/uiSlice'
import { fetchRecentWinners } from '../../store/recentWinnersSlice'
import ChatAvatar from '../chat/ChatAvatar'
import CountryFlag from '../ui/CountryFlag'
import WinningsModal from '../modals/WinningsModal'
import tpcoinPng from '../../assets/Tpcoin.png'

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

export default function WinnersCarousel() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const user = useAppSelector((s) => s.auth.user)
  const winners = useAppSelector((s) => s.recentWinners.winners)
  const loading = useAppSelector((s) => s.recentWinners.loading)
  const [slide, setSlide] = useState(0)
  const [winningsModalOpen, setWinningsModalOpen] = useState(false)

  useEffect(() => {
    void dispatch(fetchRecentWinners({ token: token ?? null }))
  }, [dispatch, token])

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

  const openWinningsModal = () => {
    if (!token) {
      dispatch(openModal('signin'))
      return
    }
    setWinningsModalOpen(true)
  }

  const onWinnerClick = (w: (typeof winners)[number]) => {
    if (!token) {
      dispatch(openModal('signin'))
      return
    }
    if (w.userId != null && w.userId > 0) {
      dispatch(
        openChatWithPeerUserId({
          userId: w.userId,
          username: w.name,
          avatarUrl: w.image,
        })
      )
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
          <button
            type="button"
            onClick={openWinningsModal}
            className="text-xs font-semibold text-white/80 underline decoration-[#ffd66b]/60 underline-offset-2 hover:text-white"
          >
            View all
          </button>
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
                <div className="relative shrink-0">
                  <ChatAvatar
                    avatarUrl={current.image}
                    alt={current.name}
                    size={64}
                    variant="rounded"
                    className="shadow-none ring-0"
                  />
                  <div className="absolute -bottom-1 -right-1 shadow-md">
                    <CountryFlag country={current.country} size={16} title={current.country ?? undefined} />
                  </div>
                </div>
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

      <WinningsModal visible={winningsModalOpen} onClose={() => setWinningsModalOpen(false)} />
    </div>
  )
}
