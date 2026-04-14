import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { ShopCatalogItem } from '../types/shopCatalog'

type CosmeticsState = {
  items: ShopCatalogItem[]
  loading: boolean
  error: string | null
}

const initialState: CosmeticsState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchCosmetics = createAsyncThunk('cosmetics/fetchAll', async () => {
  const FALLBACK_AVATARS: ShopCatalogItem[] = [
    {
      id: 'a001',
      productId: 'A001',
      name: 'Classic Explorer',
      description: 'A seasoned trivia adventurer',
      gems: 0,
      price: '1.99',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      type: 'avatar',
      badge: 'NEW',
    },
    {
      id: 'a002',
      productId: 'A002',
      name: 'Quiz Master',
      description: 'Reserved for those who know it all',
      gems: 500,
      price: '4.99',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
      image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
      type: 'avatar',
      badge: 'PREMIUM',
    },
  ]
  return FALLBACK_AVATARS
})

const cosmeticsSlice = createSlice({
  name: 'cosmetics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchCosmetics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCosmetics.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload ?? []
      })
      .addCase(fetchCosmetics.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || (action.error?.message as string) || null
      })
  },
})

export const cosmeticsReducer = cosmeticsSlice.reducer
