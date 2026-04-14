import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logout } from './authSlice'

type ShopState = {
  userBalance: { gems: number; tpcoins: number }
  ownedAvatarIds: string[]
  purchaseLoading: boolean
  error: string | null
  lastGemsFetch: number | null
}

const initialState: ShopState = {
  userBalance: { gems: 0, tpcoins: 0 },
  ownedAvatarIds: [],
  purchaseLoading: false,
  error: null,
  lastGemsFetch: null,
}

export const fetchUserGems = createAsyncThunk('shop/fetchUserGems', async (_, { getState }) => {
  const state = getState() as { shop: ShopState }
  return { gems: state.shop.userBalance.gems, fromCache: true as const }
})

export const fetchOwnedAvatarIds = createAsyncThunk('shop/fetchOwnedAvatarIds', async () => {
  return [] as string[]
})

export const purchaseAvatarWithGems = createAsyncThunk(
  'shop/purchaseAvatar',
  async (_, { rejectWithValue }) => {
    // Gem purchases are disabled in this view as we are aligning with specified payment flows.
    return rejectWithValue('Gem purchases are temporarily unavailable')
  }
)

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    clearShopError: (state) => {
      state.error = null
    },
    /** Same idea as mobile setUserBalance after daily-login POST when API returns total_gems. */
    setUserGemsBalance: (state, action: PayloadAction<number>) => {
      const n = action.payload
      if (typeof n === 'number' && Number.isFinite(n)) state.userBalance.gems = Math.max(0, Math.trunc(n))
    },
    setUserBalances: (state, action: PayloadAction<{ gems?: number; tpcoins?: number }>) => {
      const { gems, tpcoins } = action.payload
      if (typeof gems === 'number' && Number.isFinite(gems)) state.userBalance.gems = Math.max(0, Math.trunc(gems))
      if (typeof tpcoins === 'number' && Number.isFinite(tpcoins)) state.userBalance.tpcoins = Math.max(0, Math.trunc(tpcoins))
    },
    resetShop: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchUserGems.fulfilled, (state, action) => {
        state.userBalance.gems = action.payload.gems
        if (!action.payload.fromCache) {
          state.lastGemsFetch = Date.now()
        }
        state.error = null
      })
      .addCase(fetchUserGems.rejected, (state, action) => {
        state.error = (action.payload as unknown as string) || (action.error?.message as string) || null
      })
      .addCase(fetchOwnedAvatarIds.fulfilled, (state, action) => {
        state.ownedAvatarIds = action.payload
      })
      .addCase(purchaseAvatarWithGems.pending, (state) => {
        state.purchaseLoading = true
        state.error = null
      })
      .addCase(purchaseAvatarWithGems.fulfilled, (state, action) => {
        state.purchaseLoading = false
        const id = action.payload as unknown as string
        if (id && !state.ownedAvatarIds.includes(id)) {
          state.ownedAvatarIds.push(id)
        }
      })
      .addCase(purchaseAvatarWithGems.rejected, (state, action) => {
        state.purchaseLoading = false
        state.error = (action.payload as unknown as string) || (action.error?.message as string) || null
      })
  },
})

export const { clearShopError, resetShop, setUserGemsBalance, setUserBalances } = shopSlice.actions
export const shopReducer = shopSlice.reducer
