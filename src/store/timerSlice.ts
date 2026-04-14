import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'

export type NextDrawApiPayload = {
  next_draw_time?: string
  prize_pool?: number
  mode_pools?: {
    bronze?: { total_pool?: number; pool?: number; prize_pool?: number; prize_pool_share?: number; amount?: number }
    silver?: { total_pool?: number; pool?: number; prize_pool?: number; prize_pool_share?: number; amount?: number }
  }
  bronze_prize_pool?: number
  silver_prize_pool?: number
  bronze_pool?: number
  silver_pool?: number
  daily_trivia_coins?: number
}

function pickNumeric(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return undefined
}

/** Normalize draw payload — backends vary (`mode_pools`, flat keys, strings). */
export function parseDrawPools(payload: Record<string, unknown>): {
  bronze: number
  silver: number
  prizePool: number
  dailyTriviaCoins: number
} {
  const modePools = payload.mode_pools
  let bronze = 0
  let silver = 0

  if (modePools && typeof modePools === 'object' && !Array.isArray(modePools)) {
    const mp = modePools as Record<string, unknown>
    const b = mp.bronze
    const s = mp.silver
    if (b && typeof b === 'object') {
      const o = b as Record<string, unknown>
      bronze =
        pickNumeric(o.total_pool) ||
        pickNumeric(o.prize_pool_share) ||
        pickNumeric(o.pool) ||
        pickNumeric(o.prize_pool) ||
        pickNumeric(o.amount) ||
        0
    }
    if (s && typeof s === 'object') {
      const o = s as Record<string, unknown>
      silver =
        pickNumeric(o.total_pool) ||
        pickNumeric(o.prize_pool_share) ||
        pickNumeric(o.pool) ||
        pickNumeric(o.prize_pool) ||
        pickNumeric(o.amount) ||
        0
    }
  }

  if (bronze === 0) {
    bronze =
      pickNumeric(payload.bronze_prize_pool) ??
      pickNumeric(payload.bronze_pool) ??
      pickNumeric((payload.bronze as Record<string, unknown> | undefined)?.total_pool) ??
      0
  }
  if (silver === 0) {
    silver =
      pickNumeric(payload.silver_prize_pool) ??
      pickNumeric(payload.silver_pool) ??
      pickNumeric((payload.silver as Record<string, unknown> | undefined)?.total_pool) ??
      0
  }

  let prizePool = pickNumeric(payload.prize_pool) ?? 0
  if (prizePool === 0 && (bronze > 0 || silver > 0)) prizePool = bronze + silver

  const dailyTriviaCoins = pickNumeric(payload.daily_trivia_coins) ?? 0

  return { bronze, silver, prizePool, dailyTriviaCoins }
}

export type TimerState = {
  nextDrawTime: string | null
  prizePool: number
  bronzePrizePool: number
  silverPrizePool: number
  dailyTriviaCoins: number
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

const initialState: TimerState = {
  nextDrawTime: null,
  prizePool: 0,
  bronzePrizePool: 0,
  silverPrizePool: 0,
  dailyTriviaCoins: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
}

type AuthSlicePick = { auth: { token: string | null } }
type TimerRoot = { timer: TimerState }

/** Skip redundant `/draw/next` calls when data was fetched recently (unless `force`). */
export const DRAW_DATA_STALE_MS = 5 * 60 * 1000

export type FetchNextDrawArg = { force?: boolean } | undefined

export const fetchNextDraw = createAsyncThunk(
  'timer/fetchNextDraw',
  async (_arg: FetchNextDrawArg, { rejectWithValue, getState }) => {
    const token = (getState() as AuthSlicePick).auth.token
    const response = await apiService.getNextDraw(token)
    if (!response.success || !response.data) {
      return rejectWithValue(response.error ?? 'Failed to fetch draw data')
    }
    const raw = response.data as Record<string, unknown>
    if (raw.status === 'success' && raw.data && typeof raw.data === 'object') {
      return raw.data as NextDrawApiPayload
    }
    return raw as NextDrawApiPayload
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean(arg && typeof arg === 'object' && arg.force)
      if (force) return true
      const s = (getState() as TimerRoot).timer
      if (s.isLoading) return false
      if (s.lastFetched != null && Date.now() - s.lastFetched < DRAW_DATA_STALE_MS) return false
      return true
    },
  }
)

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    clearTimerError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNextDraw.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchNextDraw.fulfilled, (state, action) => {
        state.isLoading = false
        const p = action.payload as Record<string, unknown>
        state.nextDrawTime = (p.next_draw_time as string | undefined) ?? null
        const parsed = parseDrawPools(p)
        state.bronzePrizePool = parsed.bronze
        state.silverPrizePool = parsed.silver
        state.prizePool = parsed.prizePool
        state.dailyTriviaCoins = parsed.dailyTriviaCoins
        state.lastFetched = Date.now()
        state.error = null
      })
      .addCase(fetchNextDraw.rejected, (state, action) => {
        state.isLoading = false
        state.error = (action.payload as string) ?? action.error.message ?? null
      })
  },
})

export const { clearTimerError } = timerSlice.actions
export const timerReducer = timerSlice.reducer
