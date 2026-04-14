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
    ? 'font-display text-base font-bold tabular-nums text-[#ffe8a8] drop-shadow-[0_0_8px_rgba(255,214,107,0.5)] sm:text-lg'
    : 'font-display text-base font-bold tabular-nums text-[#ffd66b] sm:text-lg'
  const labelCls = emphasized
    ? 'text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-200/90 sm:text-[9px]'
    : 'text-[8px] font-bold uppercase tracking-[0.12em] text-white/45 sm:text-[9px]'

  return (
    <div className="flex w-full justify-center gap-2 sm:gap-2.5">
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

type HomeProps = {
  onStart?: () => void
  loading?: boolean
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

const Home = ({ onStart: _onStart, loading: _loading }: HomeProps) => {
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
    <section className="section-card relative bg-quiz-panel w-full max-w-[100vw] rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.28)] px-3 py-5 sm:rounded-3xl sm:px-6 sm:py-7 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <HeroParticles />

      <div className="grid grid-cols-1 items-center gap-5 sm:gap-6 md:grid-cols-[1fr_1.05fr] md:gap-8 lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="order-1 justify-self-center md:order-none"
        >
          <BrainMascot />
        </motion.div>

        <div className="order-2 space-y-3 text-center sm:space-y-4 md:order-none lg:text-left">
          <h1 className="font-display text-2xl leading-tight text-white drop-shadow-glow sm:text-3xl md:text-4xl lg:text-5xl">
            Welcome to Trivia Coin!
          </h1>
          <p className="text-sm text-cloud sm:text-base md:text-lg">Test your knowledge and challenge your friends!</p>
          <div className="flex flex-col items-center gap-3 sm:gap-4 lg:items-start">
            <div className="flex w-full max-w-2xl flex-col gap-3 sm:max-w-none">
              <div className="flex w-full justify-center lg:justify-start">
                <Button
                  data-tour="tour-start-quiz"
                  onClick={() => dispatch(navigate('daily'))}
                  className="!px-10 !py-2 text-sm font-bold sm:!py-3 sm:px-12 sm:text-lg lg:!max-w-none"
                >
                  Play
                </Button>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-center lg:justify-start lg:gap-4">
                <div className="flex w-full max-w-[13rem] flex-col justify-center gap-2 sm:mx-0 lg:max-w-[11.5rem]">
                  <div
                    className="flex items-center gap-2 rounded-2xl border-2 border-[#ffd700] px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2"
                    style={{ backgroundColor: 'rgba(139, 69, 19, 0.35)' }}
                  >
                    <img
                      src={bronzeMedalPng}
                      alt=""
                      className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
                    />
                    <span className="font-display text-sm font-bold text-[#ffd700] sm:text-base">Bronze</span>
                    <span className="ml-auto flex items-center gap-1 text-sm font-bold tabular-nums text-[#ffd700] sm:gap-1.5 sm:text-base">
                      {bronzeLabel}
                      <img src={tpcoinPng} alt="" className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5" />
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-2xl border-2 border-[#c0c0c0] px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2"
                    style={{ backgroundColor: 'rgba(30, 58, 138, 0.45)' }}
                  >
                    <img
                      src={silverMedalPng}
                      alt=""
                      className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
                    />
                    <span className="font-display text-sm font-bold text-white sm:text-base">Silver</span>
                    <span className="ml-auto flex items-center gap-1 text-sm font-bold tabular-nums text-white sm:gap-1.5 sm:text-base">
                      {silverLabel}
                      <img src={tpcoinPng} alt="" className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5" />
                    </span>
                  </div>
                </div>
                <div
                  className="flex min-w-0 flex-1 flex-col justify-center gap-2 rounded-2xl border-2 border-[#ffd700] px-3 py-2.5 shadow-[0_0_28px_rgba(255,214,107,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] sm:max-w-[16rem] lg:max-w-[14rem]"
                  style={{
                    background:
                      'linear-gradient(165deg, rgba(255,182,77,0.22) 0%, rgba(30,58,138,0.55) 45%, rgba(12,42,120,0.65) 100%)',
                  }}
                >
                  <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd66b] drop-shadow-[0_0_10px_rgba(255,214,107,0.45)] sm:text-[11px]">
                    Next draw
                  </p>
                  <DrawCountdownDigits totalSec={countdownSecs} emphasized />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WinnersCarousel />

    </section>
  )
}

export default Home
