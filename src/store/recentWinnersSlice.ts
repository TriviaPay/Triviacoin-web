import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'
import { logout } from './authSlice'

export type RecentWinner = {
  id: string
  name: string
  image: string
  prize: string
  timestamp: number
  userId: number | null
  country?: string | null
  mode?: string | null
}

const CACHE_MS = 5 * 60 * 1000

type RecentWinnersState = {
  winners: RecentWinner[]
  lastFetched: number
  loading: boolean
  error: string | null
}

const initialState: RecentWinnersState = {
  winners: [],
  lastFetched: 0,
  loading: false,
  error: null,
}

function mapRecentWinners(rawList: Record<string, unknown>[]): RecentWinner[] {
  return rawList.map((w, i) => {
    const username = String(w.username ?? w.name ?? 'Player')
    const amount =
      typeof w.money_awarded === 'number'
        ? w.money_awarded
        : typeof w.amount_won === 'number'
          ? w.amount_won
          : Number(w.amount ?? w.prize ?? 0)
    const uidRaw = w.user_id ?? w.userid ?? w.account_id
    const userId =
      typeof uidRaw === 'number' && Number.isFinite(uidRaw)
        ? uidRaw
        : typeof uidRaw === 'string' && /^\d+$/.test(uidRaw)
          ? Number(uidRaw)
          : null
    const id = String(w.id ?? userId ?? i)
    const submitted =
      String(w.submitted_at ?? w.date ?? w.created_at ?? w.draw_date ?? '') || new Date().toISOString()
    const pType = String(w.profile_pic_type ?? '')
    const profilePic =
      (w.profile_pic_url as string | null) ||
      (w.profile_pic as string | null) ||
      (w.profilePic as string | null) ||
      null
    const avUrl = (w.avatar_url as string | null) || null
    let image: string
    if (pType === 'custom' && profilePic) image = profilePic
    else if (pType === 'avatar' && avUrl) image = avUrl
    else image = profilePic || avUrl || ''
    if (!image) {
      image = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7c3aed&color=fff&size=128`
    }
    return {
      id,
      name: username,
      image,
      prize: (typeof amount === 'number' && !isNaN(amount) ? amount : 0).toFixed(2),
      timestamp: new Date(submitted).getTime(),
      userId,
      country: typeof w.country === 'string' ? w.country : null,
      mode: typeof w.mode === 'string' ? w.mode : null,
    }
  })
}

export type FetchRecentWinnersArg = {
  token: string | null
  force?: boolean
}

export const fetchRecentWinners = createAsyncThunk<
  RecentWinner[],
  FetchRecentWinnersArg,
  { rejectValue: string }
>(
  'recentWinners/fetch',
  async (arg, { rejectWithValue }) => {
    try {
      const res = await apiService.getRecentWinners(arg.token ?? null)
      if (!res.success || !res.data) {
        return rejectWithValue(res.error ?? 'Failed to load recent winners')
      }
      const d = res.data as Record<string, unknown>
      const rawList = (Array.isArray(d.winners) ? d.winners : Array.isArray(d) ? d : null) as
        | Record<string, unknown>[]
        | null
      return mapRecentWinners(rawList ?? [])
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load recent winners')
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg.force) return true
      const s = (getState() as { recentWinners: RecentWinnersState }).recentWinners
      if (s.loading) return false
      if (s.winners.length > 0 && Date.now() - s.lastFetched < CACHE_MS) return false
      return true
    },
  }
)

const recentWinnersSlice = createSlice({
  name: 'recentWinners',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(logout, () => ({ ...initialState }))

    builder
      .addCase(fetchRecentWinners.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRecentWinners.fulfilled, (state, action) => {
        state.loading = false
        state.winners = action.payload
        state.lastFetched = Date.now()
        state.error = null
      })
      .addCase(fetchRecentWinners.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? action.error.message ?? 'Failed to load recent winners'
      })
  },
})

export const recentWinnersReducer = recentWinnersSlice.reducer
