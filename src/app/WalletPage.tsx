import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store/store'
import { fetchUserGems } from '../store/shopSlice'
import { fetchGemPackages } from '../store/gemPackagesSlice'
import { authService } from '../services/authService'
import { apiService } from '../services/apiService'
import { createStripeCheckoutSession, PaymentApiError } from '../services/payments'
import { selectWalletFundingProductId } from '../utils/walletFundingProduct'
import { fetchWalletInfo, fetchTransactions, fetchWithdrawals, type Transaction, type Withdrawal } from '../store/walletSlice'
import Button from '../components/ui/Button'
import tpcoinPng from '../assets/Tpcoin.png'

const MIN_WITHDRAW_USD = 5

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
  const gemPackages = useAppSelector((s) => s.gemPackages)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [payoutDetails, setPayoutDetails] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
      setWithdrawMsg({ type: 'err', text: 'Amount cannot exceed your USD balance.' })
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

  return (
    <section className="min-h-screen relative overflow-hidden bg-[#0a21c0] p-4 text-white sm:p-6 md:p-8">
      {/* Background stardust */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Wallet</h1>
            <p className="text-xs font-medium text-white/50">Manage your USD rewards and payouts.</p>
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

        {/* Balance Card - Tighter */}
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#8124ff] via-[#4a1cff] to-[#0a21c0] p-5 sm:p-7 shadow-xl">
          <div className="relative z-10">
            <h2 className="text-xs font-bold tracking-widest text-[#FFD66B] uppercase">USD Balance</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0">
                <img src={tpcoinPng} alt="TC" className="h-12 w-12 sm:h-16 sm:w-16 object-contain drop-shadow-glow" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl sm:text-5xl font-black text-white leading-none">
                  {!authed ? '—' : (balanceUsd || 0).toFixed(0)}
                </span>
                <span className="text-lg font-bold text-white/60">USD</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-white/40">These are your earned rewards. Note: TriviaCoins (TC) are separate from USD balance.</p>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Withdraw Section - Compact Grid */}
        <div className="rounded-2xl border border-white/5 bg-[#1629a3]/80 p-5 sm:p-8 shadow-lg backdrop-blur-md">
           <div className="flex flex-col gap-5 md:flex-row md:items-start">
             <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4158f2] to-[#2b40d6] shadow-md text-white">
                <IconDownload />
             </div>
             <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Withdraw USD</h3>
                  <p className="text-[11px] font-medium text-white/30">Payouts require a minimum of $5.00 available in rewards.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={MIN_WITHDRAW_USD}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none focus:border-[#FFD66B]/40 transition-all font-mono"
                      placeholder="5.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Payout Email</label>
                    <input
                      type="text"
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0a1a8c] px-4 py-2.5 text-base font-bold text-white outline-none focus:border-[#FFD66B]/40 transition-all font-mono"
                      placeholder="paypal@example.com"
                    />
                  </div>
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
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#9146ff] to-[#6d28d9] py-3.5 text-lg font-black text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group"
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
        <div className="rounded-2xl border border-white/5 bg-[#1629a3]/40 p-4 sm:p-5 backdrop-blur-sm">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b40d6]/50 shrink-0">
                  <IconClock />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Activity</h4>
                  <p className="text-[10px] font-medium text-white/30">Recent payouts and rewards.</p>
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
                    ACTIVITY
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
                    transactions.length === 0 ? <p className="py-8 text-center text-xs font-bold text-white/20 italic">No activity</p> :
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
  )
}

export default WalletPage
