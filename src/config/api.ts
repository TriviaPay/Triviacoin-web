import { ENV_CONFIG } from './env'

/**
 * Backend route map. Guest mode: send `X-Device-UUID` only (see `api/client` interceptor);
 * registered: `Authorization: Bearer`; `POST /bind-password`: both headers.
 * Guests may call trivia free-mode, recent-winners, draw/next, global-chat GET, faqs, app-versions/latest, guest-ad-bonus POST.
 */
export const API_CONFIG = {
  BASE_URL: ENV_CONFIG.API_BASE_URL,
  ENDPOINTS: {
    AUTH: {
      CHECK_USERNAME: '/username-available',
      CHECK_EMAIL: '/email-available',
      CHECK_DESCOPE_USER: '/auth/check-descope-user',
      REFRESH: '/auth/refresh',
      PUSHER_AUTH: '/pusher/auth',
    },
    BIND_PASSWORD: '/bind-password',
    // Mobile-style: try /dev/sign-in first (validates against bind-password DB)
    // Backend OpenAPI lists /dev/sign-in; /auth/login and /login may exist per docs
    LOGIN: '/dev/sign-in',
    LOGIN_ALT: '/auth/login',
    LOGIN_DEV: '/login',
    LOGIN_FALLBACK: '/sign-in',
    LOGIN_V1: '/api/v1/auth/login',
    VALIDATE_REFERRAL: '/validate-referral',
    COUNTRIES: '/countries',
    PROFILE_SUMMARY: '/profile/summary',
    PROFILE: '/profile',
    PROFILE_COMPLETE: '/profile/complete',
    PROFILE_EXTENDED_UPDATE: '/profile/extended-update',
    /** Subscription / access for trivia mode cards (free, bronze, silver, gold, platinum). */
    PROFILE_MODES_STATUS: '/profile/modes/status',
    TRIVIA: {
      FREE_MODE_QUESTIONS: '/trivia/free-mode/questions',
      FREE_MODE_STATUS: '/trivia/free-mode/status',
      FREE_MODE_CURRENT: '/trivia/free-mode/current-question',
      FREE_MODE_SUBMIT: '/trivia/free-mode/submit-answer',
      /** Guests only — one-time ad bonus (400 if already claimed, 403 if not guest / disabled). */
      GUEST_AD_BONUS: '/trivia/free-mode/guest-ad-bonus',
      /** Registered only — 403 for guests per API spec. */
      DOUBLE_GEMS: '/trivia/free-mode/double-gems',
      BRONZE_QUESTION: '/trivia/bronze-mode/question',
      BRONZE_STATUS: '/trivia/bronze-mode/status',
      BRONZE_SUBMIT: '/trivia/bronze-mode/submit-answer',
      SILVER_QUESTION: '/trivia/silver-mode/question',
      SILVER_STATUS: '/trivia/silver-mode/status',
      SILVER_SUBMIT: '/trivia/silver-mode/submit-answer',
      /** GET status / POST claim — weekly daily login (OpenAPI: /daily-login on trivia-back-end). */
      DAILY_LOGIN: '/daily-login',
    },
    LEADERBOARD_FREE: '/trivia/free-mode/leaderboard',
    LEADERBOARD_BRONZE: '/trivia/bronze-mode/leaderboard',
    LEADERBOARD_SILVER: '/trivia/silver-mode/leaderboard',
    /** Simpler fallback when trivia/* endpoints return 404 */
    LEADERBOARD: '/leaderboard',
    /** Public draw schedule + prize pools — trivia-back-end.vercel.app/draw/next */
    NEXT_DRAW: '/draw/next',
    /** Recent draw winners (mobile parity). */
    RECENT_WINNERS: '/recent-winners',
    GLOBAL_CHAT: {
      MESSAGES: '/global-chat',
      SEND: '/global-chat/send',
    },
    PRIVATE_CHAT: {
      CONVERSATIONS: '/private-chat/conversations',
      MESSAGES: (id: number) => `/private-chat/conversations/${id}/messages`,
      SEND: '/private-chat/send',
      ACCEPT_REJECT: '/private-chat/accept-reject',
    },
    /** Guest-accessible latest version (spec). Fallbacks for older deployments. */
    APP_VERSIONS_LATEST: '/app-versions/latest',
    APP_VERSION: '/app/version',
    APP_VERSION_ALT: '/api/version',
    /** Guest-accessible FAQs JSON (spec). */
    FAQS: '/faqs',
    NOTIFICATIONS: {
      LIST: '/notifications',
      LIST_ALT: '/api/v1/notifications',
      MARK_READ: '/notifications/mark-read',
      MARK_READ_ALT: '/api/v1/notifications/mark-read',
      MARK_ALL_READ: '/notifications/read-all',
      MARK_ALL_READ_ALT: '/api/v1/notifications/read-all',
    },
    WALLET: {
      ME: '/api/v1/wallet/me',
      TRANSACTIONS: '/api/v1/wallet/transactions',
      WITHDRAW: '/api/v1/wallet/withdraw',
      WITHDRAWALS: '/api/v1/wallet/withdrawals',
    },
  },
} as const
