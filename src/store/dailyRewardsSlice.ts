import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'
import { authService } from '../services/authService'
import { logout } from './authSlice'
import { setUserGemsBalance } from './shopSlice'

export type DailyRewardRow = {
  day: number
  type: string
  value: number
  color: string
  claimed: boolean
  enabled: boolean
  isToday?: boolean
}

export type DailyRewardsState = {
  rewards: DailyRewardRow[]
  currentDay: number
  weekStartDate: string
  streakCount: number
  /** Raw API fields for web UI parity with mobile `dailyLoginStatus`. */
  daysClaimedList: number[]
  dayStatus: Record<string, boolean> | null
  totalGemsEarnedThisWeek: number | null
  loading: boolean
  claimInProgress: boolean
  error: string | null
  message: string | null
  lastFetch: number | null
}

const rewardValues = [10, 10, 15, 15, 20, 20, 30]
const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export function normalizeDaysClaimedArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((n: unknown) => {
      if (typeof n === 'number' && Number.isFinite(n)) return Math.trunc(n)
      if (typeof n === 'string' && /^\d+$/.test(n.trim())) return Number(n.trim())
      return NaN
    })
    .filter((n) => n >= 1 && n <= 7)
}

export function transformDailyLoginToRewards(apiData: Record<string, unknown>): DailyRewardRow[] {
  const currentDay = typeof apiData.current_day === 'number' ? apiData.current_day : 1
  const daysClaimed = normalizeDaysClaimedArray(apiData.days_claimed)
  const dayStatus = (apiData.day_status as Record<string, boolean> | undefined) ?? undefined
  const rewards: DailyRewardRow[] = []
  for (let i = 1; i <= 7; i++) {
    const dayName = dayNames[i - 1]
    const isClaimed = daysClaimed.includes(i) || dayStatus?.[dayName] === true
    const isToday = i === currentDay
    // Mobile: isEnabled = isClaimed || reward.day <= apiCurrentDay
    const isEnabled = isClaimed || i <= currentDay
    rewards.push({
      day: i,
      type: i === 7 ? 'diamonds' : 'diamond',
      value: rewardValues[i - 1],
      color: i === 7 ? '#CC0066' : i % 2 === 0 ? '#0066CC' : '#CC0066',
      claimed: isClaimed,
      enabled: isEnabled,
      isToday,
    })
  }
  return rewards
}

function applyDailyPayload(state: DailyRewardsState, data: Record<string, unknown>) {
  state.currentDay = typeof data.current_day === 'number' ? data.current_day : 1
  state.weekStartDate = typeof data.week_start_date === 'string' ? data.week_start_date : ''
  const dc = data.days_claimed
  state.streakCount = Array.isArray(dc) ? dc.length : 0
  state.daysClaimedList = normalizeDaysClaimedArray(dc)
  const ds = data.day_status
  state.dayStatus =
    ds && typeof ds === 'object' && !Array.isArray(ds) ? (ds as Record<string, boolean>) : null
  const tgew = data.total_gems_earned_this_week
  state.totalGemsEarnedThisWeek =
    typeof tgew === 'number' && Number.isFinite(tgew) ? tgew : null
  state.rewards = transformDailyLoginToRewards(data)
  state.lastFetch = Date.now()
  state.error = null
}

const initialState: DailyRewardsState = {
  rewards: [],
  currentDay: 1,
  weekStartDate: '',
  streakCount: 0,
  daysClaimedList: [],
  dayStatus: null,
  totalGemsEarnedThisWeek: null,
  loading: false,
  claimInProgress: false,
  error: null,
  message: null,
  lastFetch: null,
}

export const fetchDailyLoginStatus = createAsyncThunk(
  'dailyRewards/fetchDailyLoginStatus',
  async (_, { rejectWithValue }) => {
    const token = authService.getSessionToken()
    if (!token) return rejectWithValue('Not authenticated')
    const res = await apiService.fetchDailyLoginStatus(token)
    if (!res.success || !res.data) return rejectWithValue(res.error ?? 'Failed to load daily rewards')
    return res.data
  }
)

export const claimDailyLoginReward = createAsyncThunk(
  'dailyRewards/claimDailyLoginReward',
  async (_, { rejectWithValue, dispatch }) => {
    const token = authService.getSessionToken()
    if (!token) return rejectWithValue('Not authenticated')
    const claimRes = await apiService.claimDailyLoginReward(token)
    if (!claimRes.success) return rejectWithValue(claimRes.error ?? 'Claim failed')
    if (typeof claimRes.totalGems === 'number') {
      dispatch(setUserGemsBalance(claimRes.totalGems))
    }
    const statusRes = await apiService.fetchDailyLoginStatus(token)
    if (!statusRes.success || !statusRes.data) {
      return rejectWithValue(statusRes.error ?? 'Failed to refresh rewards')
    }
    return {
      data: statusRes.data,
      alreadyClaimed: Boolean(claimRes.alreadyClaimed),
      totalGems: claimRes.totalGems,
    }
  }
)

const dailyRewardsSlice = createSlice({
  name: 'dailyRewards',
  initialState,
  reducers: {
    clearDailyRewardsMessage: (state) => {
      state.message = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchDailyLoginStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDailyLoginStatus.fulfilled, (state, action) => {
        state.loading = false
        applyDailyPayload(state, action.payload as Record<string, unknown>)
      })
      .addCase(fetchDailyLoginStatus.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) ?? action.error.message ?? null
      })
      .addCase(claimDailyLoginReward.pending, (state) => {
        state.claimInProgress = true
        state.error = null
        state.message = null
      })
      .addCase(claimDailyLoginReward.fulfilled, (state, action) => {
        state.claimInProgress = false
        applyDailyPayload(state, action.payload.data as Record<string, unknown>)
        state.message = action.payload.alreadyClaimed
          ? 'You already claimed today’s reward.'
          : 'Reward claimed!'
      })
      .addCase(claimDailyLoginReward.rejected, (state, action) => {
        state.claimInProgress = false
        state.error = (action.payload as string) ?? action.error.message ?? null
      })
  },
})

export const { clearDailyRewardsMessage } = dailyRewardsSlice.actions
export const dailyRewardsReducer = dailyRewardsSlice.reducer
