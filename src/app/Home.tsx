import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import HeroParticles from '../components/animations/HeroParticles'
import brainPng from '../assets/brain.png'
import bronzeMedalPng from '../assets/bronze.png'
import silverMedalPng from '../assets/silver.png'
import tpcoinPng from '../assets/Tpcoin.png'
import { useAppDispatch, useAppSelector } from '../store/store'
import { navigate } from '../store/uiSlice'
import { patchUser } from '../store/authSlice'
import { setUserBalances } from '../store/shopSlice'
import { apiService } from '../services/apiService'
import WinnersCarousel from '../components/home/WinnersCarousel'

function useNextDrawCountdown(nextDrawTime: string | null) {
  const [remainingSec, setRemainingSec] = useState<number | null>(null)

  useEffect(() => {
    if (!nextDrawTime) {
      setRemainingSec(null)
      return
    }
    const end = Date.parse(nextDrawTime)
    if (Number.isNaN(end)) {
      setRemainingSec(null)
      return
    }
    const tick = () => setRemainingSec(Math.max(0, Math.floor((end - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextDrawTime])

  return remainingSec
}

function DrawCountdownDigits({ totalSec, emphasized }: { totalSec: number; emphasized?: boolean }) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(Math.min(n, 99)).padStart(2, '0')

  const cells = [
    { label: 'Hr', display: pad(h) },
    { label: 'Min', display: pad(m) },
    { label: 'Sec', display: pad(s) },
  ] as const

  const cellBorder = emphasized
    ? 'border-2 border-[#ffd66b]/90 ring-1 ring-cyan-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(255,214,107,0.2)]'
    : 'border border-white/20 shadow-inner'
  const cellBg = emphasized ? 'bg-gradient-to-b from-white/[0.14] to-[#0b2a6c]/40' : 'bg-white/[0.08]'
  const digitCls = emphasized
    ? 'font-display font-bold tabular-nums text-[#ffe8a8] drop-shadow-[0_0_8px_rgba(255,214,107,0.5)] text-fluid-base sm:text-fluid-lg'
    : 'font-display font-bold tabular-nums text-[#ffd66b] text-fluid-base sm:text-fluid-lg'
  const labelCls = emphasized
    ? 'type-caption text-cyan-200/90'
    : 'type-caption text-white/45'

  return (
    <div className="flex w-full min-w-0 justify-center gap-1.5 sm:gap-2 md:gap-2.5">
      {cells.map((u) => (
        <div key={u.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <motion.div
            key={`${u.label}-${u.display}`}
            initial={{ scale: 0.97 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={`w-full rounded-xl px-1 py-1.5 text-center sm:px-1.5 sm:py-2 ${cellBorder} ${cellBg}`}
          >
            <span className={digitCls}>{u.display}</span>
          </motion.div>
          <span className={labelCls}>{u.label}</span>
        </div>
      ))}
    </div>
  )
}

const BrainMascot = () => (
  <div className="relative mx-auto flex max-w-[min(100%,280px)] items-center justify-center sm:max-w-[min(100%,320px)] md:max-w-none">
    <div className="absolute inset-0 blur-3xl bg-[#fcb72b]/30" />
    <img
      src={brainPng}
      alt="Trivia mascot"
      className="relative h-32 w-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)] min-[400px]:h-40 sm:h-44 md:h-52 lg:h-60"
      loading="lazy"
    />
  </div>
)

const Home = () => {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const { bronzePrizePool, silverPrizePool, nextDrawTime } = useAppSelector((s) => s.timer)
  const remainingSec = useNextDrawCountdown(nextDrawTime)

  useEffect(() => {
    if (token) {
      void apiService.fetchProfileSummary(token).then((res) => {
        if (res.success && res.data) {
          const d = res.data
          dispatch(
            patchUser({
              recent_draw_earnings: d.recent_draw_earnings,
              username: d.username,
              profilePicUrl: d.profile_pic_url,
            })
          )
          dispatch(
            setUserBalances({
              gems: d.total_gems,
              tpcoins: d.total_trivia_coins,
            })
          )
        }
      })
    }
  }, [dispatch, token])

  const bronzeLabel =
    typeof bronzePrizePool === 'number'
      ? bronzePrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—'
  const silverLabel =
    typeof silverPrizePool === 'number'
      ? silverPrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—'

  const countdownSecs = remainingSec != null && remainingSec > 0 ? remainingSec : 0

  return (
    <div className="flex w-full flex-col gap-6 sm:gap-8">
      {/* Hero Section Card */}
      <section className="section-card relative w-full overflow-hidden rounded-3xl bg-quiz-panel px-3 py-5 shadow-[0_16px_32px_rgba(0,0,0,0.28)] sm:px-6 sm:py-7 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <HeroParticles />
        <div className="grid grid-cols-1 items-center gap-5 sm:gap-6 md:grid-cols-[1fr_1.05fr] md:gap-8 lg:grid-cols-[1fr_1.1fr]">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="order-1 justify-self-center md:order-none"
          >
            <BrainMascot />
          </motion.div>

          <div className="order-2 space-y-4 text-center md:order-none lg:text-left">
            <h1 className="type-hero-title text-safe">
              Welcome to Trivia Coin!
            </h1>
            <p className="type-body text-cloud text-safe">
              Jump into Trivia Challenge — play daily, climb the ranks, and unlock exclusive rewards!
            </p>
            
            <div className="mt-4 flex flex-col items-center gap-6 lg:items-start">
              <div className="mb-4 flex w-full justify-center lg:justify-start">
                <Button
                  data-tour="tour-start-quiz"
                  onClick={() => dispatch(navigate('daily'))}
                  className="!px-8 !py-2.5 sm:!px-12 sm:!py-3"
                >
                  Play
                </Button>
              </div>

              <div className="flex w-full min-w-0 flex-col items-stretch justify-center gap-4 sm:gap-5 md:flex-row md:flex-wrap lg:flex-nowrap lg:justify-start">
                <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-1 lg:max-w-[min(100%,15rem)]">
                  <div
                    className="flex min-w-0 items-center gap-2 rounded-2xl border-2 border-[#ffd700] px-2.5 py-2 sm:gap-2.5 sm:px-3"
                    style={{ backgroundColor: 'rgba(139, 69, 19, 0.35)' }}
                  >
                    <img src={bronzeMedalPng} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-7 sm:w-7" />
                    <span className="min-w-0 shrink font-display font-bold text-[#ffd700] text-fluid-xs sm:text-fluid-sm md:text-fluid-base">
                      Rookie
                    </span>
                    <span className="ml-auto flex min-w-0 shrink-0 items-center gap-1 font-bold tabular-nums text-[#ffd700] text-fluid-xs sm:text-fluid-sm md:text-fluid-base">
                      <span className="min-w-0 truncate">{bronzeLabel}</span>
                      <img src={tpcoinPng} alt="" className="h-3.5 w-3.5 shrink-0 object-contain sm:h-4 sm:w-4" />
                    </span>
                  </div>
                  <div
                    className="flex min-w-0 items-center gap-2 rounded-2xl border-2 border-[#c0c0c0] px-2.5 py-2 sm:gap-2.5 sm:px-3"
                    style={{ backgroundColor: 'rgba(30, 58, 138, 0.45)' }}
                  >
                    <img src={silverMedalPng} alt="" className="h-5 w-5 shrink-0 object-contain sm:h-7 sm:w-7" />
                    <span className="min-w-0 shrink font-display font-bold text-white text-fluid-xs sm:text-fluid-sm md:text-fluid-base">
                      Scholar
                    </span>
                    <span className="ml-auto flex min-w-0 shrink-0 items-center gap-1 font-bold tabular-nums text-white text-fluid-xs sm:text-fluid-sm md:text-fluid-base">
                      <span className="min-w-0 truncate">{silverLabel}</span>
                      <img src={tpcoinPng} alt="" className="h-3.5 w-3.5 shrink-0 object-contain sm:h-4 sm:w-4" />
                    </span>
                  </div>
                </div>

                <div
                  className="flex w-full min-w-0 flex-1 flex-col justify-center gap-2 rounded-2xl border-2 border-[#ffd700] px-2.5 py-2 shadow-[0_0_24px_rgba(255,214,107,0.2)] sm:px-3 sm:py-2.5 md:min-w-[min(100%,15rem)] md:max-w-full lg:max-w-[min(100%,15rem)] lg:flex-none"
                  style={{
                    background: 'linear-gradient(165deg, rgba(255,182,77,0.2) 0%, rgba(30,58,138,0.5) 45%, rgba(12,42,120,0.6) 100%)',
                  }}
                >
                  <p className="type-caption text-center text-[#ffd66b]">
                    Next draw
                  </p>
                  <DrawCountdownDigits totalSec={countdownSecs} emphasized />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Winnings Section Restored Inside the Main Container */}
        <WinnersCarousel />
      </section>
    </div>
  )
}

export default Home
