import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { SubscriptionPlan } from '../types/subscriptionPlan'

type SubscriptionsState = {
  plans: SubscriptionPlan[]
  loading: boolean
  error: string | null
}

const initialState: SubscriptionsState = {
  plans: [],
  loading: false,
  error: null,
}

export const fetchSubscriptionPlans = createAsyncThunk(
  'subscriptions/fetchAll',
  async () => {
    // Hardcoded fallback since backend spec doesn't include a catalog listing endpoint.
    // These match SUB001-SUB004 supported by our Stripe/PayPal implementation.
    const FALLBACK_PLANS: SubscriptionPlan[] = [
      {
        productId: 'SUB001',
        name: 'Bronze Mode',
        priceMinor: 499,
        currency: 'USD',
        interval: 'monthly',
        features: ['Access to Bronze Mode', 'Daily Rewards Plus'],
      },
      {
        productId: 'SUB002',
        name: 'Silver Mode',
        priceMinor: 999,
        currency: 'USD',
        interval: 'monthly',
        features: ['Access to Silver Mode', 'Weekly Challenge Entry', 'No Interstitial Ads'],
      },
      {
        productId: 'SUB003',
        name: 'Gold Mode',
        priceMinor: 1999,
        currency: 'USD',
        interval: 'monthly',
        features: ['Access to Gold Mode', 'Direct Winner Perks', 'Exclusive Badge'],
      },
      {
        productId: 'SUB004',
        name: 'Diamond Mode',
        priceMinor: 4999,
        currency: 'USD',
        interval: 'monthly',
        features: ['Access to Diamond Mode', 'Legendary Avatar Frame', 'Monthly Gem Bonus'],
      },
    ]

    return FALLBACK_PLANS
  },
)

const subscriptionsSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
        state.loading = false
        state.plans = action.payload
      })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || (action.error?.message as string) || null
      })
  },
})

export const subscriptionsReducer = subscriptionsSlice.reducer
