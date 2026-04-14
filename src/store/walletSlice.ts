import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'
import type { RootState } from './store'

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
    builder
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
