import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import InfoTooltip from '../components/ui/InfoTooltip'
import { fetchUserGems } from '../store/shopSlice'
import { fetchGemPackages } from '../store/gemPackagesSlice'
import { authService } from '../services/authService'
import { apiService } from '../services/apiService'
import { createStripeCheckoutSession, PaymentApiError } from '../services/payments'
import { selectWalletFundingProductId } from '../utils/walletFundingProduct'
import { fetchWalletInfo, fetchTransactions, fetchWithdrawals, type Transaction, type Withdrawal } from '../store/walletSlice'
import { fetchModesStatus } from '../store/triviaSlice'
import { fetchSubscriptionPlans } from '../store/subscriptionsSlice'
import { navigate } from '../store/uiSlice'
import { getModeInfo, modeAllowsPlay } from '../utils/triviaTierMeta'
import tpcoinPng from '../assets/Tpcoin.png'

const MIN_WITHDRAW_USD = 5

/** TC shown per 1.00 withdrawable payout (1 TC = 1 USD when unset). Override with `VITE_TC_PER_USD`. */
const TC_PER_USD = (() => {
  const v = Number(import.meta.env.VITE_TC_PER_USD)
  return Number.isFinite(v) && v > 0 ? v : 1
})()

// Inline SVGs matching Lucide icons
const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
)
const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
)
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
)
const IconArrowUpRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
)
const IconArrowDownLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>
)

const WalletPage = () => {
  const dispatch = useAppDispatch()
  const { tpcoins } = useAppSelector((s) => s.shop.userBalance)
  const { balanceUsd, transactions, withdrawals, loading, error: walletError } = useAppSelector((s) => s.wallet)
  const authed = useAppSelector((s) => s.auth.isAuthenticated)
  const token = useAppSelector((s) => s.auth.token)
  const user = useAppSelector((s) => s.auth.user)
  const modesStatus = useAppSelector((s) => s.trivia.modesStatus)
  const subscriptionPlans = useAppSelector((s) => s.subscriptions.plans)
  const gemPackages = useAppSelector((s) => s.gemPackages)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [payoutDetails, setPayoutDetails] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [converterUsd, setConverterUsd] = useState('')
  const [converterTc, setConverterTc] = useState('')

  const [showHistory, setShowHistory] = useState(false)
  const [historyTab, setHistoryTab] = useState<'transactions' | 'withdrawals'>('transactions')
  const [fundError, setFundError] = useState<string | null>(null)
  const [stripeBusy, setStripeBusy] = useState(false)

  const loadData = useCallback(() => {
    const t = token ?? authService.getSessionToken()
    if (!t) return
    void dispatch(fetchUserGems())
    void dispatch(fetchWalletInfo())
    void dispatch(fetchTransactions({ page: 1, page_size: 10 }))
    void dispatch(fetchWithdrawals({ page: 1, page_size: 10 }))
  }, [dispatch, token])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const t = token ?? authService.getSessionToken()
    if (!t) return
    void dispatch(fetchGemPackages())
  }, [dispatch, authed, token])

  useEffect(() => {
    if (!authed || !token) return
    void dispatch(fetchModesStatus())
    void dispatch(fetchSubscriptionPlans())
  }, [dispatch, authed, token])

  const fundingProductId = useMemo(
    () => selectWalletFundingProductId(gemPackages.items),
    [gemPackages.items]
  )

  const payStripe = useCallback(async () => {
    const t = token ?? authService.getSessionToken()
    if (!t?.trim()) {
      setFundError('Please sign in to pay with Stripe.')
      return
    }
    const pid = fundingProductId
    if (!pid) {
      setFundError('Payments are not ready yet. Try again in a moment.')
      return
    }
    setStripeBusy(true)
    setFundError(null)
    try {
      const res = await createStripeCheckoutSession(pid, t)
      window.location.href = res.checkout_url
    } catch (e) {
      setFundError(
        e instanceof PaymentApiError ? e.message : e instanceof Error ? e.message : 'Could not start checkout'
      )
      setStripeBusy(false)
    }
  }, [fundingProductId, token])

  const submitWithdraw = async () => {
    setWithdrawMsg(null)
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount < MIN_WITHDRAW_USD) {
      setWithdrawMsg({ type: 'err', text: `Minimum withdrawal is $${MIN_WITHDRAW_USD.toFixed(2)}.` })
      return
    }
    if (amount > balanceUsd) {
      setWithdrawMsg({ type: 'err', text: 'Amount cannot exceed your balance.' })
      return
    }
    if (!payoutDetails.trim()) {
      setWithdrawMsg({ type: 'err', text: 'Please provide payout details.' })
      return
    }

    const t = token ?? authService.getSessionToken()
    if (!t) {
      setWithdrawMsg({ type: 'err', text: 'Sign in required.' })
      return
    }

    setWithdrawBusy(true)
    try {
      const res = await apiService.requestWithdrawal(t, {
        amount_usd: amount,
        method: 'PayPal',
        details: payoutDetails.trim(),
      })
      if (res.success) {
        setWithdrawMsg({ type: 'ok', text: 'Success!' })
        setWithdrawAmount('')
        setPayoutDetails('')
        loadData()
      } else {
        setWithdrawMsg({ type: 'err', text: res.error ?? 'Request failed.' })
      }
    } catch (e) {
      setWithdrawMsg({ type: 'err', text: 'An error occurred.' })
    } finally {
      setWithdrawBusy(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date)
    } catch (e) { return dateStr }
  }

  const canWithdraw = (balanceUsd || 0) >= MIN_WITHDRAW_USD

  const withdrawUsdNum = parseFloat(withdrawAmount)
  const withdrawTcEquivalent =
    Number.isFinite(withdrawUsdNum) && withdrawUsdNum > 0
      ? TC_PER_USD === 1
        ? withdrawUsdNum
        : Math.round(withdrawUsdNum * TC_PER_USD)
      : null

  const onConverterUsdChange = (raw: string) => {
    setConverterUsd(raw)
    const n = parseFloat(raw)
    if (raw.trim() === '' || Number.isNaN(n)) {
      setConverterTc('')
      return
    }
    setConverterTc(
      TC_PER_USD === 1 ? String(n) : String(Math.round(n * TC_PER_USD)),
    )
  }

  const onConverterTcChange = (raw: string) => {
    setConverterTc(raw)
    const n = parseFloat(raw)
    if (raw.trim() === '' || Number.isNaN(n)) {
      setConverterUsd('')
      return
    }
    setConverterUsd((n / TC_PER_USD).toFixed(2))
  }

  const triviaTierLabels: Record<number, string> = {
    1: 'Rookie',
    2: 'Scholar',
    3: 'Master',
    4: 'Genius',
  }

  const subscriptionInsights = useMemo(() => {
    const rows: string[] = []
    const uid = user?.subscription_type?.trim()
    if (uid) {
      const uidUpper = uid.toUpperCase()
      const plan = subscriptionPlans.find((p) => {
        const pid = typeof p?.productId === 'string' ? p.productId.trim() : ''
        if (!pid) return false
        return pid === uid || pid.toUpperCase() === uidUpper
      })
      rows.push(
        plan
          ? `${plan.name} · billed ${plan.interval ?? 'recurring'}`
          : `Account plan reference: ${uid}`,
      )
    }
    for (let idx = 1; idx <= 4; idx++) {
      const info = getModeInfo(idx, modesStatus)
      if (!info) continue
      const stRaw = String(info.subscription_status ?? '').trim()
      if (!stRaw || stRaw.toLowerCase() === 'not_required') continue
      const st = stRaw.toLowerCase()
      const subscribedTier =
        modeAllowsPlay(info) ||
        ['active', 'trialing', 'subscribed', 'paid', 'past_due', 'canceled', 'cancelled'].includes(st)
      if (subscribedTier) {
        const label = triviaTierLabels[idx] ?? `Tier ${idx}`
        rows.push(`${label}: ${stRaw}`)
      }
    }
    return [...new Set(rows)]
  }, [user?.subscription_type, modesStatus, subscriptionPlans])

  const subscriptionBadgeUrls = useMemo(() => {
    const raw = user?.subscription_badges
    if (!Array.isArray(raw)) return []
    return raw
      .map((b) => {
        if (!b || typeof b !== 'object') return null
        const url = (b as { image_url?: string }).image_url
        return typeof url === 'string' && url.trim() ? url.trim() : null
      })
      .filter((x): x is string => x != null)
  }, [user?.subscription_badges])

  const subscriptionAside = authed ? (
    <aside className="relative flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06] p-4 shadow-inner backdrop-blur-sm sm:min-h-[240px] sm:p-5 lg:min-h-0">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFD66B]/95">My subscription</h3>
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {subscriptionBadgeUrls.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {subscriptionBadgeUrls.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                className="h-9 w-9 rounded-lg border border-white/15 bg-black/20 object-contain sm:h-10 sm:w-10"
              />
            ))}
          </div>
        ) : null}
        {subscriptionInsights.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-4 text-sm font-medium text-white/85">
            {subscriptionInsights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-auto text-sm leading-relaxed text-white/55">
            No trivia subscription on file yet. Unlock paid tiers from{' '}
            <button
              type="button"
              className="font-semibold text-[#FFD66B] underline decoration-[#FFD66B]/40 underline-offset-2 hover:text-white"
              onClick={() => dispatch(navigate('daily'))}
            >
              Trivia Challenge
            </button>
            .
          </p>
        )}
      </div>
    </aside>
  ) : (
    <aside className="relative flex min-h-[220px] min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-5 text-center sm:min-h-[240px] lg:min-h-0">
      <p className="text-sm text-white/50">Sign in to see your subscription status.</p>
    </aside>
  )

  return (
    <section
      className="relative mx-auto w-full max-w-xl space-y-6 text-white sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
      data-tour="tour-wallet"
    >
      {/* Header — outside main wallet card */}
      <div className="flex items-center justify-between px-1 pt-1 sm:px-0">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Wallet</h1>
          <InfoTooltip content="Manage your rewards balance and payouts. TriviaCoins (TC) in the shop are separate from this withdrawable balance." />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="group flex items-center gap-1.5 rounded-full bg-[#FFD66B] px-5 py-2 text-xs font-bold text-[#633e00] shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <span>Refresh</span>
          <div className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>
            <IconRefresh />
          </div>
        </button>
      </div>

      {/* Balance + subscription — siblings outside the main section-card */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#8124ff] via-[#4a1cff] to-[#0a21c0] p-5 shadow-xl sm:min-h-[240px] sm:p-7">
          <div className="relative z-10 flex flex-1 flex-col">
            <h2 className="text-xs font-bold tracking-widest text-[#FFD66B] uppercase">Balance</h2>
            <div className="mt-3 flex flex-1 items-center gap-4">
              <div className="shrink-0">
                <img src={tpcoinPng} alt="TC" className="h-12 w-12 sm:h-16 sm:w-16 object-contain drop-shadow-glow" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl sm:text-5xl font-black text-white leading-none">
                  {!authed ? '—' : (balanceUsd || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="mt-auto pt-3 text-[11px] font-medium text-white/40">
              Withdrawable rewards balance. Shop TC uses the converter reference below (1 TC = 1 USD).
            </p>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        </div>
        {subscriptionAside}
      </div>

      {/* Main wallet panel (withdraw, history) */}
      <section className="section-card relative w-full rounded-3xl bg-quiz-panel">
        <div className="relative z-10 mx-auto w-full max-w-xl space-y-6 px-3 pb-6 pt-4 sm:px-5 sm:pb-8 sm:pt-5 md:max-w-none md:px-6">
        {/* Withdraw Section - Compact Grid */}
        <div className="rounded-2xl border border-white/20 bg-quiz-panel/60 p-5 shadow-lg backdrop-blur-md sm:p-8">
           <div className="flex flex-col gap-5 md:flex-row md:items-start">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4158f2] to-[#2b40d6] shadow-md text-white">
                <IconDownload />
             </div>
             <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Withdraw</h3>
                  <p className="text-[11px] font-medium text-white/30">Minimum payout $5.00 from available rewards balance.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Payout amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={MIN_WITHDRAW_USD}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none focus:border-[#FFD66B]/40 transition-all font-mono"
                      placeholder="5.00"
                    />
                    {withdrawTcEquivalent != null ? (
                      <p className="text-[11px] font-semibold text-[#FFD66B]/90">
                        ≈{' '}
                        {TC_PER_USD === 1
                          ? withdrawTcEquivalent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                          : withdrawTcEquivalent.toLocaleString()}{' '}
                        TC (1 TC = 1 USD)
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Payout email</label>
                    <input
                      type="text"
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none focus:border-[#FFD66B]/40 transition-all font-mono"
                      placeholder="paypal@example.com"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/15 bg-[#0a1a8c]/35 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/45">TC converter</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    TC → USD reference (same rate as below). Payout uses USD with TC equivalent shown above.
                    {!import.meta.env.PROD ? ' · VITE_TC_PER_USD' : ''}.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">TriviaCoins (TC)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={converterTc}
                        onChange={(e) => onConverterTcChange(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none transition-all focus:border-[#FFD66B]/40 font-mono"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">USD equivalent</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={converterUsd}
                        onChange={(e) => onConverterUsdChange(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none transition-all focus:border-[#FFD66B]/40 font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-white/30">
                    Wallet TC balance (shop):{' '}
                    <span className="font-bold text-[#FFD66B]/90">{tpcoins.toLocaleString()} TC</span>
                    <span className="text-white/40">
                      {' '}
                      · ≈{' '}
                      {(tpcoins / TC_PER_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD equivalent
                    </span>
                  </p>
                </div>

                {!canWithdraw && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[11px] font-bold text-amber-400">
                      Insufficient Balance for Payout (Min $5.00 required)
                    </p>
                  </div>
                )}

                {withdrawMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold animate-pulse ${withdrawMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {withdrawMsg.text}
                  </div>
                )}

                <button
                  onClick={() => void submitWithdraw()}
                  disabled={withdrawBusy || !authed || !canWithdraw}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#ffd66b] to-[#f3a011] py-3.5 text-lg font-bold text-[#7c4c00] shadow-xl transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {withdrawBusy ? (
                    <div className="h-5 w-5 animate-spin"><IconRefresh /></div>
                  ) : (
                    <>
                      <span>Request Payout</span>
                      <IconSend />
                    </>
                  )}
                </button>
             </div>
           </div>
        </div>

        {/* History - Tighter panel */}
        <div className="rounded-2xl border border-white/20 bg-quiz-panel/40 p-4 backdrop-blur-sm sm:p-5">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b40d6]/50 shrink-0">
                  <IconClock />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Transactions</h4>
                  <p className="text-[10px] font-medium text-white/30">Recent transactions and payouts.</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 rounded-full bg-[#2b40d6] px-4 py-2 text-[11px] font-black text-white transition hover:bg-[#3d52e0] active:scale-95"
              >
                <span>{showHistory ? 'Hide' : 'View'}</span>
                <div className={`transition-transform duration-300 ${showHistory ? 'rotate-90' : ''}`}>
                  <IconChevronRight />
                </div>
              </button>
           </div>

           {showHistory && (
             <div className="mt-5 space-y-4">
                <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto">
                  <button
                    onClick={() => setHistoryTab('transactions')}
                    className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black tracking-widest transition-all rounded-full ${historyTab === 'transactions' ? 'bg-white text-[#0a21c0]' : 'text-white/40 hover:text-white/70'}`}
                  >
                    TRANSACTIONS
                  </button>
                  <button
                    onClick={() => setHistoryTab('withdrawals')}
                    className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black tracking-widest transition-all rounded-full ${historyTab === 'withdrawals' ? 'bg-white text-[#0a21c0]' : 'text-white/40 hover:text-white/70'}`}
                  >
                    PAYOUTS
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {!authed ? (
                    <p className="py-8 text-center text-xs font-bold text-white/20 italic">Sign in needed</p>
                  ) : historyTab === 'transactions' ? (
                    transactions.length === 0 ? <p className="py-8 text-center text-xs font-bold text-white/20 italic">No transactions yet</p> :
                    transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5 hover:bg-white/10 transition">
                        <div className="flex items-center gap-3 text-white">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.amount_usd >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {t.amount_usd >= 0 ? <IconArrowUpRight /> : <IconArrowDownLeft />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-white">{t.kind.replace(/_/g, ' ')}</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase">{formatDate(t.created_at)}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-black ${t.amount_usd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.amount_usd >= 0 ? '+' : ''}{formatCurrency(t.amount_usd || 0)}
                        </p>
                      </div>
                    ))
                  ) : (
                    withdrawals.length === 0 ? <p className="py-8 text-center text-xs font-bold text-white/20 italic">No payouts</p> :
                    withdrawals.map(w => (
                      <div key={w.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5 hover:bg-white/10 transition">
                        <div className="flex items-center gap-3 text-white">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                            <IconDownload />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight text-white">Payout ({w.withdrawal_method})</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase">{formatDate(w.requested_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-white">{formatCurrency(w.amount || 0)}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${w.withdrawal_status.toLowerCase() === 'processed' ? 'text-emerald-400' : 'text-[#FFD66B]'}`}>
                            {w.withdrawal_status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-center pb-8">
          {authed && (
             <button
               onClick={payStripe}
               disabled={stripeBusy}
               className="text-[10px] font-bold text-white/20 underline decoration-white/10 hover:text-white/40 transition-all uppercase tracking-widest"
             >
               {stripeBusy ? 'Loading Stripe...' : 'Top-up TriviaCoins'}
             </button>
          )}
        </div>
      </div>
      </section>
    </section>
  )
}

export default WalletPage
