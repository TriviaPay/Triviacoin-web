import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiService } from '../services/apiService'
import { logout } from './authSlice'
import type { LeaderboardTier } from './uiSlice'
import { extractListFromApiPayload, filterRecentWinnersForTier } from '../utils/leaderboardResponse'
import boyImg from '../assets/boy.jpg'
import girlImg from '../assets/girl.jpg'

const fallbackAvatars = [boyImg, girlImg, boyImg, girlImg]

const LB_CACHE_TTL_MS = 5 * 60 * 1000

export type LeaderboardRow = {
  id: string
  name: string
  score: number
  avatar: string
  userId: number
  country?: string | null
  position?: number
  submittedAt?: string | null
  profilePic?: string | null
  badgeImageUrl?: string | null
  avatarRawUrl?: string | null
  frameUrl?: string | null
  subscriptionBadges: unknown[]
  dateWon?: string | null
  level?: number | null
  levelProgress?: string | null
  moneyAwarded?: number | null
}

type TierSlot = {
  rows: LeaderboardRow[]
  drawDate: string
  lastFetched: number
  error: string | null
  authed: boolean
}

type LeaderboardState = {
  slots: Record<LeaderboardTier, TierSlot | null>
  loadingTier: LeaderboardTier | null
}

const initialState: LeaderboardState = {
  slots: { bronze: null, silver: null },
  loadingTier: null,
}

function formatScore(amount: number | string | null | undefined): number {
  if (typeof amount === 'number' && isFinite(amount)) return Math.round(amount)
  if (typeof amount === 'string') {
    const n = parseFloat(amount)
    if (!isNaN(n)) return Math.round(n)
  }
  return 0
}

function isRasterImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false
  if (/\.json(\?|$)/i.test(url)) return false
  if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)) return true
  return url.includes('profile_pic') || url.includes('triviapics') || url.includes('default_profile')
}

function listAvatarFromEntry(entry: any, idx: number): string {
  const pic = entry.profile_pic ?? entry.profile_pic_url
  if (isRasterImageUrl(pic)) return pic
  const av = entry.avatar_url
  if (isRasterImageUrl(av)) return av
  return fallbackAvatars[idx % fallbackAvatars.length] as string
}

function extractRecentWinnersList(data: Record<string, unknown> | unknown[] | undefined): Record<string, unknown>[] {
  return extractListFromApiPayload(data)
}

/** Recent-winners payload includes `country`; bronze/silver leaderboard endpoints often do not. */
function recentWinnersForTier(
  list: Record<string, unknown>[],
  tier: LeaderboardTier,
  drawDate: string
): Record<string, unknown>[] {
  return filterRecentWinnersForTier(list, tier, drawDate)
}

function countryMapFromEntries(entries: Record<string, unknown>[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const w of entries) {
    const uidRaw = w.user_id ?? w.userid ?? w.account_id
    const uid = typeof uidRaw === 'number' ? uidRaw : typeof uidRaw === 'string' ? Number(uidRaw) : NaN
    const c = typeof w.country === 'string' ? w.country.trim() : ''
    if (Number.isFinite(uid) && uid > 0 && c && !/^unknown$/i.test(c)) {
      map.set(uid, c)
    }
  }
  return map
}

function applyCountryToRows(rows: LeaderboardRow[], countryByUser: Map<number, string>): LeaderboardRow[] {
  if (countryByUser.size === 0) return rows
  return rows.map((row) => ({
    ...row,
    country: row.country ?? (row.userId > 0 ? countryByUser.get(row.userId) ?? null : null),
  }))
}

function transformLeaderboard(entries: unknown[]): LeaderboardRow[] {
  if (!Array.isArray(entries)) return []
  return entries.map((entry: any, idx: number) => {
    const userId = Number(
      entry.user_id ?? entry.userid ?? entry.account_id ?? entry.player_id ?? entry.winner_id
    )
    const uidOk = Number.isFinite(userId) && userId > 0
    return {
      id: String(uidOk ? userId : `idx-${idx}`),
      userId: uidOk ? userId : 0,
      name: entry.username ?? entry.name ?? 'Unknown',
      score: formatScore(entry.amount_won ?? entry.amount ?? entry.score ?? entry.gems_awarded ?? entry.money_awarded ?? 0),
      avatar: listAvatarFromEntry(entry, idx),
      country: typeof entry.country === 'string' ? entry.country : null,
      position: typeof entry.position === 'number' ? entry.position : idx + 1,
      submittedAt: entry.submitted_at ?? null,
      profilePic: entry.profile_pic ?? entry.profile_pic_url ?? null,
      badgeImageUrl: entry.badge_image_url ?? null,
      avatarRawUrl: entry.avatar_url ?? null,
      frameUrl: entry.frame_url ?? null,
      subscriptionBadges: Array.isArray(entry.subscription_badges) ? entry.subscription_badges : [],
      dateWon: entry.date_won ?? null,
      level: typeof entry.level === 'number' ? entry.level : null,
      levelProgress: typeof entry.level_progress === 'string' ? entry.level_progress : null,
      moneyAwarded: typeof entry.money_awarded === 'number' ? entry.money_awarded : null,
    }
  })
}

export type FetchLeaderboardArg = {
  tier: LeaderboardTier
  drawDate: string
  token: string | null
  isAuthenticated: boolean
  force?: boolean
}

export const fetchLeaderboardData = createAsyncThunk<
  { tier: LeaderboardTier; drawDate: string; rows: LeaderboardRow[]; authed: boolean },
  FetchLeaderboardArg,
  { rejectValue: string }
>(
  'leaderboard/fetch',
  async (arg, { rejectWithValue }) => {
    try {
      let res: { success: boolean; data?: { leaderboard?: unknown[] }; error?: string }
      if (arg.tier === 'bronze') {
        res = await apiService.getBronzeModeLeaderboard(arg.drawDate, arg.isAuthenticated ? arg.token : null)
      } else {
        res = await apiService.getSilverModeLeaderboard(arg.drawDate, arg.isAuthenticated ? arg.token : null)
      }
      const token = arg.isAuthenticated ? arg.token : null
      const rwRes = await apiService.getRecentWinners(token)
      const recentList = rwRes.success && rwRes.data ? extractRecentWinnersList(rwRes.data) : []
      const tierRecent = recentWinnersForTier(recentList, arg.tier, arg.drawDate)
      const countryByUser = countryMapFromEntries(tierRecent)

      let rows: LeaderboardRow[] = []
      if (res.success && res.data) {
        const raw = res.data.leaderboard ?? []
        rows = transformLeaderboard(Array.isArray(raw) ? raw : extractListFromApiPayload(res.data))
      }

      if (rows.length === 0 && tierRecent.length > 0) {
        rows = transformLeaderboard(tierRecent)
      } else {
        rows = applyCountryToRows(rows, countryByUser)
      }

      if (!res.success && rows.length === 0) {
        return rejectWithValue(res.error ?? 'Failed to load')
      }

      return {
        tier: arg.tier,
        drawDate: arg.drawDate,
        rows,
        authed: arg.isAuthenticated,
      }
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load leaderboard')
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg.force) return true
      const s = (getState() as { leaderboard: LeaderboardState }).leaderboard
      const slot = s.slots[arg.tier]
      if (!slot) return true
      if (slot.drawDate !== arg.drawDate) return true
      if (slot.authed !== arg.isAuthenticated) return true
      if (slot.error) return true
      if (Date.now() - slot.lastFetched >= LB_CACHE_TTL_MS) return true
      return false
    },
  }
)

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    clearLeaderboardTierError: (state, action: PayloadAction<LeaderboardTier>) => {
      const t = action.payload
      const slot = state.slots[t]
      if (slot) slot.error = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => ({ ...initialState }))

    builder
      .addCase(fetchLeaderboardData.pending, (state, action) => {
        state.loadingTier = action.meta.arg.tier
      })
      .addCase(fetchLeaderboardData.fulfilled, (state, action) => {
        state.loadingTier = null
        const { tier, drawDate, rows, authed } = action.payload
        state.slots[tier] = {
          rows,
          drawDate,
          lastFetched: Date.now(),
          error: null,
          authed,
        }
      })
      .addCase(fetchLeaderboardData.rejected, (state, action) => {
        state.loadingTier = null
        if (!action.meta?.arg) return
        const { tier, drawDate, isAuthenticated } = action.meta.arg
        const msg = action.payload ?? action.error.message ?? 'Failed to load'
        const prev = state.slots[tier]
        state.slots[tier] = {
          rows: prev?.drawDate === drawDate ? prev.rows : [],
          drawDate,
          lastFetched: prev?.drawDate === drawDate ? prev.lastFetched : 0,
          error: typeof msg === 'string' ? msg : String(msg),
          authed: isAuthenticated,
        }
      })
  },
})

export const { clearLeaderboardTierError } = leaderboardSlice.actions
export const leaderboardReducer = leaderboardSlice.reducer
