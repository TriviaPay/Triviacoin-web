import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import { quizReducer } from './quizSlice'
import { uiReducer } from './uiSlice'
import { authReducer } from './authSlice'
import { countryReducer } from './countrySlice'
import { shopReducer } from './shopSlice'
import { cosmeticsReducer } from './cosmeticsSlice'
import { gemPackagesReducer } from './gemPackagesSlice'
import { subscriptionsReducer } from './subscriptionsSlice'
import { triviaReducer } from './triviaSlice'
import { dailyRewardsReducer } from './dailyRewardsSlice'
import { timerReducer } from './timerSlice'
import { leaderboardReducer } from './leaderboardSlice'
import { checkoutReducer } from './checkoutSlice'
import { walletReducer } from './walletSlice'
import { injectStore } from '../lib/storeRef'
import { subscribeSessionInvalidated } from '../lib/sessionInvalidate'
import { logout } from './authSlice'
import { openModal } from './uiSlice'

export const store = configureStore({
  reducer: {
    quiz: quizReducer,
    ui: uiReducer,
    auth: authReducer,
    countries: countryReducer,
    shop: shopReducer,
    cosmetics: cosmeticsReducer,
    gemPackages: gemPackagesReducer,
    subscriptions: subscriptionsReducer,
    trivia: triviaReducer,
    dailyRewards: dailyRewardsReducer,
    timer: timerReducer,
    leaderboard: leaderboardReducer,
    checkout: checkoutReducer,
    wallet: walletReducer,
  },
})

injectStore(store)

subscribeSessionInvalidated(() => {
  store.dispatch(logout())
  store.dispatch(openModal('signin'))
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
