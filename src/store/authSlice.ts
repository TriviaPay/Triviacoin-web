import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { authService } from '../services/authService'
import { apiService } from '../services/apiService'
import type { DescopeSdk } from '../services/authService'
import { getDescopeUserIdFromJwt, getEmailFromJwt } from '../lib/jwt'

export type AuthStep = 'email_verification' | 'otp_verification' | 'password_setup' | 'login'

export interface User {
  id: string
  descope_user_id?: string
  email: string
  username: string
  country?: string
  date_of_birth?: string
  /** Lottie / animated avatar URL from profile API */
  avatarUrl?: string | null
  /** Static profile image URL from profile API */
  profilePicUrl?: string | null
  subscription_type?: string | null
  subscription_badges?: any[] | null
  recent_draw_earnings?: number | null
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
  user: User | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  user: null,
}

export const sendOTPVerification = createAsyncThunk(
  'auth/sendOtp',
  async (
    { email, descope }: { email: string; descope: DescopeSdk | null },
    { rejectWithValue }
  ) => {
    if (!descope) return rejectWithValue('Auth not ready')
    const result = await authService.sendOTP(descope, email)
    if (!result.success) return rejectWithValue(result.error || 'Failed to send OTP')
    return { success: true }
  }
)

export const verifyOTP = createAsyncThunk(
  'auth/verifyOtp',
  async (
    { email, code, descope }: { email: string; code: string; descope: DescopeSdk | null },
    { rejectWithValue }
  ) => {
    if (!descope) return rejectWithValue('Auth not ready')
    const result = await authService.verifyOTP(descope, email, code)
    if (!result.success) return rejectWithValue(result.error || 'Invalid verification code')
    const descopeUserId = result.user?.userId ?? (result.token ? getDescopeUserIdFromJwt(result.token) : null)
    return {
      success: true,
      token: result.token!,
      refreshToken: result.refreshToken,
      user: result.user,
      descope_user_id: descopeUserId,
    }
  }
)

export const bindPassword = createAsyncThunk(
  'auth/bindPassword',
  async (
    payload: {
      email: string
      password: string
      username: string
      country: string
      date_of_birth: string
      referral_code?: string | null
      token: string
      descope_user_id?: string
    },
    { rejectWithValue }
  ) => {
    const { token, descope_user_id, ...rest } = payload
    const result = await apiService.bindPassword(
      {
        email: rest.email,
        password: rest.password,
        username: rest.username,
        country: rest.country,
        dateOfBirth: rest.date_of_birth,
        referral_code: rest.referral_code,
        descope_user_id,
      },
      token
    )
    if (!result.success) return rejectWithValue(result.error || 'Bind password failed')

    // Sync can be added here once backend supports a canonical user mapping.
    // For now, use the password-bound user directly.
    const user = result.data?.user ?? result.data

    return {
      success: true,
      user: user
        ? {
            id: String(user.id ?? user.account_id ?? user.descope_user_id ?? rest.email),
            descope_user_id: user.descope_user_id ?? descope_user_id,
            email: String(user.email ?? rest.email),
            username: String(user.username ?? user.name ?? rest.username ?? ''),
          }
        : {
            id: rest.email,
            descope_user_id: descope_user_id ?? undefined,
            email: rest.email,
            username: rest.username ?? '',
          },
    }
  }
)

export const loginWithPassword = createAsyncThunk(
  'auth/login',
  async (
    {
      identifier,
      password,
      descope,
      descopeInstance,
    }: { identifier: string; password: string; descope?: DescopeSdk | null; descopeInstance?: DescopeSdk | null },
    { rejectWithValue }
  ) => {
    const rawIdentifier = identifier.trim()
    const email = rawIdentifier.toLowerCase()
    const sdk = descope ?? descopeInstance ?? null

    if (!sdk) return rejectWithValue('Auth not ready. Please wait.')

    // Use Descope SDK only (descopeAuthService pattern - no backend endpoint calls)
    const tries = rawIdentifier !== email ? [email, rawIdentifier] : [email]
    let lastError = 'Invalid email or password'
    for (const loginId of tries) {
      const result = await authService.loginWithPassword(sdk, loginId, password)
      if (result.success && result.token) {
        const descopeUserId = result.user?.userId
        if (!descopeUserId) {
          return rejectWithValue('Login succeeded but no user ID. Please try again.')
        }

        const media = { avatarUrl: null as string | null, profilePicUrl: null as string | null }
        const user = {
          id: descopeUserId,
          descope_user_id: descopeUserId,
          email: result.user?.email ?? email,
          username: result.user?.name ?? '',
          avatarUrl: media.avatarUrl,
          profilePicUrl: media.profilePicUrl,
        }

        return {
          success: true,
          user,
          token: result.token,
          refreshToken: result.refreshToken,
        }
      }
      if (result.error) lastError = result.error
    }
    return rejectWithValue(lastError)
  }
)

export const checkEmailAvailability = createAsyncThunk(
  'auth/checkEmail',
  async (email: string) => apiService.checkEmailAvailability(email)
)

/**
 * Hydrate session on app load: token in storage but no user in Redux.
 * Syncs with backend using descope_user_id (never email as primary).
 * On sync failure, falls back to JWT-derived user so app doesn't break.
 */
export const hydrateSession = createAsyncThunk(
  'auth/hydrateSession',
  async (_, { rejectWithValue }) => {
    const token = authService.getSessionToken()
    if (!token) return rejectWithValue('No session token')

    const descopeUserId = getDescopeUserIdFromJwt(token)
    const email = getEmailFromJwt(token)
    if (!descopeUserId) {
      authService.clearTokens()
      return rejectWithValue('Invalid session token')
    }

    // Fallback: use JWT-derived user so app doesn't break (sync-user removed as requested)
    return {
      token,
      user: {
        id: descopeUserId,
        descope_user_id: descopeUserId,
        email: email ?? '',
        username: '',
      } as User,
    }
  }
)

export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsername',
  async ({ username, token }: { username: string; token?: string | null }) =>
    apiService.checkUsernameAvailability(username, token)
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setError: (state, action: { payload: string | null }) => {
      state.error = action.payload
    },
    setUserProfileMedia: (
      state,
      action: { payload: { avatarUrl?: string | null; profilePicUrl?: string | null } },
    ) => {
      if (!state.user) return
      const { avatarUrl, profilePicUrl } = action.payload
      if (avatarUrl !== undefined) state.user.avatarUrl = avatarUrl
      if (profilePicUrl !== undefined) state.user.profilePicUrl = profilePicUrl
    },
    /** Keep navbar / initials aligned with profile API (username, etc.). */
    patchUser: (state, action: PayloadAction<Partial<User>>) => {
      if (!state.user) return
      Object.assign(state.user, action.payload)
    },
    /** After POST /auth/refresh — keeps Redux in sync with localStorage session JWT. */
    sessionTokenRefreshed: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      authService.setSessionToken(action.payload)
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.token = null
      state.user = null
      state.error = null
      authService.clearTokens()
    },
  },
  extraReducers: (builder) => {
    const pend = (state: AuthState) => {
      state.isLoading = true
      state.error = null
    }
    const rej = (state: AuthState, action: any) => {
      state.isLoading = false
      state.error = action.payload || action.error?.message || 'Request failed'
    }

    builder
      .addCase(sendOTPVerification.pending, pend)
      .addCase(sendOTPVerification.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(sendOTPVerification.rejected, rej)

      .addCase(verifyOTP.pending, pend)
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        if (action.payload.token) authService.setSessionToken(action.payload.token)
        const rt = action.payload.refreshToken
        if (typeof rt === 'string' && rt) authService.setRefreshToken(rt)
      })
      .addCase(verifyOTP.rejected, rej)

      .addCase(bindPassword.pending, pend)
      .addCase(bindPassword.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        const user = action.payload?.user as User | undefined
        state.user = user ?? {
          id: (action.meta.arg as { email: string }).email,
          email: (action.meta.arg as { email: string }).email,
          username: (action.meta.arg as { username?: string }).username ?? '',
        }
      })
      .addCase(bindPassword.rejected, rej)

      .addCase(loginWithPassword.pending, pend)
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.user = action.payload.user as User
        if (action.payload.token) authService.setSessionToken(action.payload.token)
        const rt = action.payload.refreshToken
        if (typeof rt === 'string' && rt) authService.setRefreshToken(rt)
      })
      .addCase(loginWithPassword.rejected, rej)

      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.user = action.payload.user as User
      })
      .addCase(hydrateSession.rejected, (state) => {
        state.token = null
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { setError, logout, setUserProfileMedia, patchUser, sessionTokenRefreshed } = authSlice.actions
export const authReducer = authSlice.reducer
