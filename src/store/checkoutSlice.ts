import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { Page } from './uiSlice'

export type CheckoutPaymentRoute = 'one_time' | 'subscription'

export type CheckoutDraft = {
  /** `product_id` from store/cosmetics or `profile/modes/status` — never a display label. */
  productId: string
  quantity: number
  label: string
  paymentRoute: CheckoutPaymentRoute
  price?: string
  iconUrl?: string
  /** Cancel / back navigation target after clearing checkout. */
  cancelReturnPage?: Page
}

type CheckoutState = {
  draft: CheckoutDraft | null
}

const initialState: CheckoutState = {
  draft: null,
}

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    startCheckout: (state, action: PayloadAction<CheckoutDraft>) => {
      state.draft = action.payload
    },
    clearCheckout: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState)
  },
})

export const { startCheckout, clearCheckout } = checkoutSlice.actions
export const checkoutReducer = checkoutSlice.reducer
