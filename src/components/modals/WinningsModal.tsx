import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { fetchWalletEarnings } from '../../store/walletSlice'
import CloseIcon from '../ui/CloseIcon'
import tpcoinPng from '../../assets/Tpcoin.png'

type Props = {
  visible: boolean
  onClose: () => void
}

function formatTcAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function CoinAmount({
  amount,
  size = 'md',
  className = '',
}: {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const textClass = size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'
  const imgClass = size === 'lg' ? 'h-5 w-5 sm:h-6 sm:w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold tabular-nums text-[#ffd66b] ${textClass} ${className}`}
    >
      <span>{formatTcAmount(amount)}</span>
      <img src={tpcoinPng} alt="" className={`${imgClass} shrink-0 object-contain`} />
    </span>
  )
}

function modeDisplayName(subscriptionType: string, subscriptionName: string): string {
  const t = subscriptionType.toLowerCase()
  if (t === 'bronze') return 'Rookie'
  if (t === 'silver') return 'Scholar'
  if (/bronze/i.test(subscriptionName)) return 'Rookie'
  if (/silver/i.test(subscriptionName)) return 'Scholar'
  return subscriptionName
}

function formatEarningDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const WinningsModal = ({ visible, onClose }: Props) => {
  const dispatch = useAppDispatch()
  const earnings = useAppSelector((s) => s.wallet.earnings)
  const loading = useAppSelector((s) => s.wallet.earningsLoading)
  const error = useAppSelector((s) => s.wallet.earningsError)

  useEffect(() => {
    if (!visible) return
    void dispatch(fetchWalletEarnings())
  }, [visible, dispatch])

  const refetch = useCallback(() => {
    void dispatch(fetchWalletEarnings({ force: true }))
  }, [dispatch])

  if (!visible) return null

  const total = earnings?.total_winnings_amount_usd ?? 0
  const totals = earnings?.subscription_totals ?? []
  const rows = earnings?.earnings ?? []

  const bronzeTotal = totals.find((t) => t.subscription_type.toLowerCase() === 'bronze')
  const silverTotal = totals.find((t) => t.subscription_type.toLowerCase() === 'silver')

  const summarySlots = [
    { key: 'total', label: 'Total winnings', amount: total },
    { key: 'rookie', label: 'Rookie', amount: bronzeTotal?.total_winnings_amount_usd ?? 0 },
    { key: 'scholar', label: 'Scholar', amount: silverTotal?.total_winnings_amount_usd ?? 0 },
  ]

  return (
    <div
      className="fixed inset-0 z-[150] isolate flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[min(90vh,690px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-[#1e3a8a] to-[#0c3c89] text-white shadow-2xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="winnings-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 id="winnings-modal-title" className="font-display text-lg font-bold text-[#ffd66b] sm:text-xl">
            Your Winnings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {loading && !earnings ? (
          <div className="flex flex-1 justify-center py-12">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#ffd66b] border-t-transparent" />
          </div>
        ) : error && !earnings ? (
          <div className="flex flex-1 flex-col justify-center px-4 py-8 text-center sm:px-5">
            <p className="text-sm text-white/85">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4">
            <div className="shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/[0.08]">
              <div className="grid grid-cols-3 divide-x divide-white/15">
                {summarySlots.map((slot) => (
                  <div
                    key={slot.key}
                    className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-3"
                  >
                    <p className="w-full truncate text-[10px] font-semibold uppercase tracking-wide text-white/60 sm:text-xs">
                      {slot.label}
                    </p>
                    <CoinAmount amount={slot.amount} size="sm" className="mt-1 justify-center sm:text-base" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <p className="mb-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/55 sm:text-xs">
                Earnings history
              </p>
              <div className="min-h-[240px] flex-1 overflow-y-auto scrollbar-overlay pr-0.5">
                {rows.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-6 text-center text-sm text-white/70">
                    No earnings recorded yet. Play daily trivia to start winning!
                  </p>
                ) : (
                  <ul className="space-y-2 pb-1">
                    {rows.map((row, i) => (
                      <li
                        key={`${row.date}-${row.subscription_type}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {modeDisplayName(row.subscription_type, row.subscription_name)}
                          </p>
                          <p className="text-xs text-white/60">{formatEarningDate(row.date)}</p>
                        </div>
                        <CoinAmount amount={row.amount_usd} size="sm" className="shrink-0" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {error && earnings ? (
              <p className="mt-2 shrink-0 text-center text-xs text-amber-200/90">{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default WinningsModal
