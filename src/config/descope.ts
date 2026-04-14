// Web-specific Descope configuration derived from mobile setup
// Ensures redirect URL uses current origin (not mobile deep links)
import { ENV_CONFIG } from './env'

export const DESCOPE_CONFIG = {
  projectId: ENV_CONFIG.DESCOPE_PROJECT_ID || '',
  baseUrl: 'https://api.descope.com',
  persistTokens: true,
  autoRefresh: true,
  logger: {
    level: 'error',
  },
  // Use web origin for OAuth / magic link redirects
  redirectUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',

  // Session management (storage keys)
  sessionTokenKey: 'descope_session_token',
  refreshTokenKey: 'descope_refresh_token',
}

export const AUTH_STEPS = {
  EMAIL_VERIFICATION: 'email_verification',
  OTP_VERIFICATION: 'otp_verification',
  PASSWORD_SETUP: 'password_setup',
  USERNAME_SETUP: 'username_setup',
  PROFILE_SETUP: 'profile_setup',
  COMPLETED: 'completed',
} as const

export const VERIFICATION_METHODS = {
  OTP: 'otp',
  MAGIC_LINK: 'magic_link',
  PASSWORD: 'password',
} as const

export const DESCOPE_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_OTP: 'Invalid verification code',
  OTP_EXPIRED: 'Verification code expired',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  /** E062903 - Password stored in backend (bind-password) not synced to Descope */
  PASSWORD_SIGNIN_FAILED: 'Invalid email or password',
} as const

export const DESCOPE_ERROR_CODES = {
  E062903: 'PASSWORD_SIGNIN_FAILED',
  E062901: 'INVALID_CREDENTIALS',
  E011003: 'INVALID_REQUEST',
} as const

export type AuthStep = (typeof AUTH_STEPS)[keyof typeof AUTH_STEPS]
export type VerificationMethod = (typeof VERIFICATION_METHODS)[keyof typeof VERIFICATION_METHODS]

