/**
 * Auth Service - Descope SDK wrapper for web
 * Uses @descope/react-sdk via useDescope hook in components
 */
import { DESCOPE_CONFIG } from '../config/descope'
import { getDescopeUserIdFromJwt, getDescopeProjectIdFromJwt, getEmailFromJwt } from '../lib/jwt'

export type DescopeSdk = {
  otp?: {
    signUpOrIn?: { email?: (loginId: string) => Promise<{ ok: boolean; error?: { errorMessage?: string; errorDescription?: string } }> }
    verify?: { email?: (loginId: string, code: string) => Promise<{ ok: boolean; data?: { sessionJwt?: string; refreshJwt?: string }; error?: { errorMessage?: string; errorDescription?: string } }> }
  }
  password?: {
    signIn?: (loginId: string, password: string) => Promise<{ ok: boolean; data?: { sessionJwt?: string; refreshJwt?: string; user?: any }; error?: { errorMessage?: string; errorDescription?: string; errorCode?: string } }>
    /** Set password on OTP-verified user — required for `password.signIn` to work */
    update?: (loginId: string, newPassword: string, token?: string) => Promise<{ ok: boolean; error?: { errorMessage?: string; errorDescription?: string; errorCode?: string } }>
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

  /**
   * Descope POST /v1/auth/password/update — third arg must be the **refresh JWT**
   * from OTP verify (not the session JWT). See Descope password SDK docs.
   */
  async setPasswordAfterOtp(
    descope: DescopeSdk,
    identifier: string,
    password: string,
    refreshToken?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!descope?.password?.update) return { success: false, error: 'Auth not ready. Please wait.' }
    const loginId = identifier.trim().toLowerCase()
    const token = refreshToken ?? authService.getRefreshToken()
    if (!token) {
      return { success: false, error: 'Session expired. Please verify the code again.' }
    }
    try {
      const resp = await descope.password.update(loginId, password, token)
      if ((resp as any).ok) return { success: true }
      const err = (resp as any).error
      const msg = err?.errorDescription || err?.errorMessage || 'Failed to set password'
      if (import.meta.env.DEV) {
        console.warn('[auth] Descope password.update failed', {
          loginId,
          errorCode: err?.errorCode,
          error: msg,
          hint: 'password.update requires the refresh JWT from OTP verify, not the session JWT.',
        })
      }
      return { success: false, error: msg }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to set password' }
    }
  },

  /** Descope POST /v1/auth/password/signin — loginId must match email used at bind (lowercased). */
  async loginWithPassword(
    descope: DescopeSdk,
    identifier: string,
    password: string
  ): Promise<{ success: boolean; token?: string; refreshToken?: string; user?: { userId: string; email?: string; name?: string }; error?: string }> {
    if (!descope?.password?.signIn) return { success: false, error: 'Auth not ready. Please wait.' }
    const loginId = identifier.trim().toLowerCase()
    try {
      const resp = await descope.password.signIn(loginId, password)
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
      const code = err?.errorCode as string | undefined
      let msg = err?.errorDescription || err?.errorMessage || 'Invalid email or password'
      if (code === 'E062903') {
        msg =
          'Invalid email or password. If you signed up before a password reset was done on this account, use Forgot Password once — that syncs your password with sign-in.'
      }
      if (import.meta.env.DEV) {
        const cached = authService.getSessionToken()
        const jwtProject = cached ? getDescopeProjectIdFromJwt(cached) : null
        console.warn('[auth] Descope password.signIn failed', {
          loginId,
          errorCode: code,
          descopeProjectId: DESCOPE_CONFIG.projectId,
          signInUrl: 'https://api.descope.com/v1/auth/password/signin',
          note:
            'At sign-in, jwtProjectId is usually null (no session yet) — that is not a project mismatch. In Network, confirm the sign-in request Authorization header uses the same descopeProjectId.',
          cachedJwtProjectId: jwtProject,
          cachedJwtMatchesConfig: jwtProject ? jwtProject === DESCOPE_CONFIG.projectId : null,
        })
      }
      return { success: false, error: msg }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' }
    }
  },
}
