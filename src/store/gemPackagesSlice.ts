import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { ShopCatalogItem } from '../types/shopCatalog'

type GemPackagesState = {
  items: ShopCatalogItem[]
  loading: boolean
  error: string | null
}

const initialState: GemPackagesState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchGemPackages = createAsyncThunk('gemPackages/fetchAll', async () => {
  const FALLBACK_GEMS: ShopCatalogItem[] = [
    {
      id: 'g001',
      productId: 'G001',
      name: 'Starter Gems Pack (50)',
      description: '50 Gems to get you started',
      gems: 50,
      price: '0.99',
      url: null,
      image_url: null,
      type: 'gem',
      badge: 'Starter',
    },
    {
      id: 'g002',
      productId: 'G002',
      name: 'Standard Gems Pack (250)',
      description: '250 Gems for more challenges',
      gems: 250,
      price: '4.99',
      url: null,
      image_url: null,
      type: 'gem',
      badge: 'Popular',
    },
    {
      id: 'g003',
      productId: 'G003',
      name: 'Value Gems Pack (1,000)',
      description: '1,000 Gems for serious players',
      gems: 1000,
      price: '19.99',
      url: null,
      image_url: null,
      type: 'gem',
      badge: 'Best Value',
    },
    {
      id: 'g004',
      productId: 'G004',
      name: 'Mega Gems Pack (5,000)',
      description: '5,000 Gems for the ultimate trivia master',
      gems: 5000,
      price: '99.99',
      url: null,
      image_url: null,
      type: 'gem',
      badge: 'Ultimate',
    },
  ]
  return FALLBACK_GEMS
})

const gemPackagesSlice = createSlice({
  name: 'gemPackages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchGemPackages.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchGemPackages.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload ?? []
      })
      .addCase(fetchGemPackages.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || (action.error?.message as string) || null
      })
  },
})

export const gemPackagesReducer = gemPackagesSlice.reducer
