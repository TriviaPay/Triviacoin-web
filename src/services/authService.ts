/**
 * Auth Service - Descope SDK wrapper for web
 * Uses @descope/react-sdk via useDescope hook in components
 */
import { DESCOPE_CONFIG } from '../config/descope'
import { getDescopeUserIdFromJwt, getEmailFromJwt } from '../lib/jwt'

export type DescopeSdk = {
  otp?: {
    signUpOrIn?: { email?: (loginId: string) => Promise<{ ok: boolean; error?: { errorMessage?: string; errorDescription?: string } }> }
    verify?: { email?: (loginId: string, code: string) => Promise<{ ok: boolean; data?: { sessionJwt?: string; refreshJwt?: string }; error?: { errorMessage?: string; errorDescription?: string } }> }
  }
  password?: {
    signIn?: (loginId: string, password: string) => Promise<{ ok: boolean; data?: { sessionJwt?: string; refreshJwt?: string; user?: any }; error?: { errorMessage?: string; errorDescription?: string } }>
  }
} | null

let cachedToken: string | null = null

/** Backend / spec key mirrored alongside Descope session JWT for guest vs auth detection */
const LEGACY_JWT_KEY = 'token'

export const authService = {
  setSessionToken(token: string) {
    cachedToken = token
    try {
      localStorage.setItem(DESCOPE_CONFIG.sessionTokenKey, token)
      localStorage.setItem(LEGACY_JWT_KEY, token)
    } catch {}
  },

  getSessionToken(): string | null {
    if (cachedToken) return cachedToken
    try {
      return (
        localStorage.getItem(DESCOPE_CONFIG.sessionTokenKey) ||
        localStorage.getItem(LEGACY_JWT_KEY)
      )
    } catch {
      return null
    }
  },

  /** Descope refresh JWT — required for POST /auth/refresh when the session JWT expires. */
  setRefreshToken(token: string) {
    try {
      localStorage.setItem(DESCOPE_CONFIG.refreshTokenKey, token)
    } catch {}
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(DESCOPE_CONFIG.refreshTokenKey)
    } catch {
      return null
    }
  },

  clearTokens() {
    cachedToken = null
    try {
      localStorage.removeItem(DESCOPE_CONFIG.sessionTokenKey)
      localStorage.removeItem(DESCOPE_CONFIG.refreshTokenKey)
      localStorage.removeItem(LEGACY_JWT_KEY)
    } catch {}
  },

  async sendOTP(descope: DescopeSdk, email: string): Promise<{ success: boolean; error?: string }> {
    if (!descope?.otp?.signUpOrIn?.email) return { success: false, error: 'Auth not ready. Please wait.' }
    try {
      const resp = await descope.otp.signUpOrIn.email(email.trim().toLowerCase())
      if ((resp as any).ok) return { success: true }
      const err = (resp as any).error
      const msg = err?.errorMessage || err?.errorDescription || 'Failed to send OTP'
      return { success: false, error: msg }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to send OTP' }
    }
  },

  async verifyOTP(
    descope: DescopeSdk,
    email: string,
    code: string
  ): Promise<{ success: boolean; token?: string; refreshToken?: string; user?: { userId: string; email?: string; name?: string }; error?: string }> {
    if (!descope?.otp?.verify?.email) return { success: false, error: 'Auth not ready. Please wait.' }
    try {
      const resp = await descope.otp.verify.email(email.trim().toLowerCase(), code.trim())
      const data = (resp as any).data
      if ((resp as any).ok && data?.sessionJwt) {
        const rawUser = data?.user
        let user: { userId: string; email?: string; name?: string } | undefined
        if (rawUser) {
          user = {
            userId: rawUser.userId ?? rawUser.user_id ?? rawUser.sub,
            email: rawUser.email ?? email,
            name: rawUser.name ?? rawUser.displayName,
          }
        } else {
          const userId = getDescopeUserIdFromJwt(data.sessionJwt)
          const jwtEmail = getEmailFromJwt(data.sessionJwt)
          if (userId) user = { userId, email: jwtEmail ?? email, name: undefined }
        }
        return {
          success: true,
          token: data.sessionJwt,
          refreshToken: data.refreshJwt,
          user,
        }
      }
      const err = (resp as any).error
      const msg = err?.errorMessage || err?.errorDescription || 'Invalid verification code'
      return { success: false, error: msg }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Invalid verification code' }
    }
  },

  async loginWithPassword(
    descope: DescopeSdk,
    identifier: string,
    password: string
  ): Promise<{ success: boolean; token?: string; refreshToken?: string; user?: { userId: string; email?: string; name?: string }; error?: string }> {
    if (!descope?.password?.signIn) return { success: false, error: 'Auth not ready. Please wait.' }
    const loginId = identifier.trim()
    try {
      const resp = await (descope.password!.signIn as any)(loginId, password, {})
      const data = (resp as any).data
      if ((resp as any).ok && data?.sessionJwt) {
        const rawUser = data?.user
        const user = rawUser
          ? { userId: rawUser.userId ?? rawUser.user_id ?? rawUser.sub, email: rawUser.email, name: rawUser.name ?? rawUser.displayName }
          : undefined
        return {
          success: true,
          token: data.sessionJwt,
          refreshToken: data.refreshJwt,
          user,
        }
      }
      const err = (resp as any).error
      const msg = err?.errorMessage || err?.errorDescription || 'Invalid email or password'
      return { success: false, error: msg }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  },
}
