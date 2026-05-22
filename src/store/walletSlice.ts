import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'
import { logout } from './authSlice'
import type { RootState } from './store'

const EARNINGS_CACHE_MS = 5 * 60 * 1000

export type WalletEarningRow = {
  amount_usd: number
  date: string
  subscription_amount_usd: number
  subscription_name: string
  subscription_type: string
}

export type WalletSubscriptionTotal = {
  subscription_amount_usd: number
  subscription_name: string
  subscription_type: string
  total_winnings_amount_usd: number
}

export type WalletEarningsData = {
  currency: string
  total_winnings_amount_usd: number
  subscription_totals: WalletSubscriptionTotal[]
  earnings: WalletEarningRow[]
}

function parseWalletEarnings(raw: Record<string, unknown>): WalletEarningsData {
  const earningsRaw = Array.isArray(raw.earnings) ? raw.earnings : []
  const totalsRaw = Array.isArray(raw.subscription_totals) ? raw.subscription_totals : []
  return {
    currency: String(raw.currency ?? 'usd'),
    total_winnings_amount_usd:
      typeof raw.total_winnings_amount_usd === 'number' ? raw.total_winnings_amount_usd : 0,
    subscription_totals: totalsRaw.map((row) => {
      const r = row as Record<string, unknown>
      return {
        subscription_amount_usd:
          typeof r.subscription_amount_usd === 'number' ? r.subscription_amount_usd : 0,
        subscription_name: String(r.subscription_name ?? ''),
        subscription_type: String(r.subscription_type ?? ''),
        total_winnings_amount_usd:
          typeof r.total_winnings_amount_usd === 'number' ? r.total_winnings_amount_usd : 0,
      }
    }),
    earnings: earningsRaw.map((row) => {
      const r = row as Record<string, unknown>
      return {
        amount_usd: typeof r.amount_usd === 'number' ? r.amount_usd : 0,
        date: String(r.date ?? ''),
        subscription_amount_usd:
          typeof r.subscription_amount_usd === 'number' ? r.subscription_amount_usd : 0,
        subscription_name: String(r.subscription_name ?? ''),
        subscription_type: String(r.subscription_type ?? ''),
      }
    }),
  }
}

export interface Transaction {
  id: number
  amount_minor: number
  amount_usd: number
  currency: string
  kind: string
  created_at: string
}

export interface Withdrawal {
  id: number
  amount: number
  withdrawal_method: string
  withdrawal_status: string
  requested_at: string
  processed_at: string | null
}

interface WalletState {
  balanceUsd: number
  balanceMinor: number
  currency: string
  transactions: Transaction[]
  withdrawals: Withdrawal[]
  loading: boolean
  error: string | null
  transactionsTotal: number
  withdrawalsTotal: number
  earnings: WalletEarningsData | null
  earningsLastFetched: number
  earningsLoading: boolean
  earningsError: string | null
}

const initialState: WalletState = {
  balanceUsd: 0,
  balanceMinor: 0,
  currency: 'USD',
  transactions: [],
  withdrawals: [],
  loading: false,
  error: null,
  transactionsTotal: 0,
  withdrawalsTotal: 0,
  earnings: null,
  earningsLastFetched: 0,
  earningsLoading: false,
  earningsError: null,
}

export const fetchWalletInfo = createAsyncThunk(
  'wallet/fetchInfo',
  async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token
    if (!token) return rejectWithValue('No token')
    const res = await apiService.fetchWalletInfo(token)
    if (!res.success) return rejectWithValue(res.error)
    return res.data
  }
)

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (params: { page?: number; page_size?: number; kind?: string } | undefined, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token
    if (!token) return rejectWithValue('No token')
    const res = await apiService.fetchWalletTransactions(token, params)
    if (!res.success) return rejectWithValue(res.error)
    return res.data
  }
)

export type FetchWalletEarningsArg = { force?: boolean } | undefined

export const fetchWalletEarnings = createAsyncThunk<
  WalletEarningsData,
  FetchWalletEarningsArg,
  { rejectValue: string; state: RootState }
>(
  'wallet/fetchEarnings',
  async (_arg, { getState, rejectWithValue }) => {
    const token = getState().auth.token
    if (!token) return rejectWithValue('Sign in to view earnings')
    const res = await apiService.fetchWalletEarnings(token)
    if (!res.success || !res.data) {
      return rejectWithValue(res.error ?? 'Failed to load earnings')
    }
    return parseWalletEarnings(res.data)
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean(arg && typeof arg === 'object' && arg.force)
      if (force) return true
      const s = getState().wallet
      if (s.earningsLoading) return false
      if (s.earnings && Date.now() - s.earningsLastFetched < EARNINGS_CACHE_MS) return false
      return true
    },
  }
)

export const fetchWithdrawals = createAsyncThunk(
  'wallet/fetchWithdrawals',
  async (params: { page?: number; page_size?: number } | undefined, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token
    if (!token) return rejectWithValue('No token')
    const res = await apiService.fetchWalletWithdrawals(token, params?.page, params?.page_size)
    if (!res.success) return rejectWithValue(res.error)
    return res.data
  }
)

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.earnings = null
      state.earningsLastFetched = 0
      state.earningsLoading = false
      state.earningsError = null
    })

    builder
      .addCase(fetchWalletEarnings.pending, (state) => {
        state.earningsLoading = true
        state.earningsError = null
      })
      .addCase(fetchWalletEarnings.fulfilled, (state, action) => {
        state.earningsLoading = false
        state.earnings = action.payload
        state.earningsLastFetched = Date.now()
        state.earningsError = null
      })
      .addCase(fetchWalletEarnings.rejected, (state, action) => {
        state.earningsLoading = false
        state.earningsError = (action.payload as string) ?? action.error.message ?? 'Failed to load earnings'
      })
      .addCase(fetchWalletInfo.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWalletInfo.fulfilled, (state, action) => {
        state.loading = false
        state.balanceUsd = action.payload.balance_usd
        state.balanceMinor = action.payload.balance_minor
        state.currency = action.payload.currency
        if (action.payload.recent_transactions) {
          state.transactions = action.payload.recent_transactions
        }
      })
      .addCase(fetchWalletInfo.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Transactions
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions
        state.transactionsTotal = action.payload.total
      })
      // Withdrawals
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.withdrawals = action.payload.withdrawals
        state.withdrawalsTotal = action.payload.total
      })
  },
})

export const { clearWalletError } = walletSlice.actions
export const walletReducer = walletSlice.reducer
