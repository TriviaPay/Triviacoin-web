import type { Page } from '../../store/uiSlice'

export type TourPlacement = 'top' | 'bottom' | 'center'

export type OnboardingStep = {
  id: string
  /** `data-tour` attribute value; omit or empty for centered step */
  target?: string
  title: string
  description: string
  placement?: TourPlacement
  /** Screen to open before highlighting `target` (defaults to home). */
  page?: Page
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    page: 'home',
    title: 'Welcome to Trivia Coin',
    description:
      'Take a quick tour of the main spots: home quiz and results, daily challenges, leaderboard, wallet, shop, profile, chats, and settings.',
    placement: 'center',
  },
  {
    id: 'notifications',
    page: 'home',
    target: 'tour-notifications',
    title: 'Stay in the loop',
    description: 'Open notifications here for draws, rewards, and updates. The bell is right next to your daily bonus.',
    placement: 'bottom',
  },
  {
    id: 'sidebar-quiz',
    page: 'home',
    target: 'tour-sidebar-quiz',
    title: 'Play from Home',
    description:
      'Answer the free daily quiz in this panel: tap an option, then Submit. You can change your choice before submitting.',
    placement: 'bottom',
  },
  {
    id: 'winners',
    page: 'home',
    target: 'tour-winners',
    title: 'Recent winners',
    description:
      'See who won recent draws. Tap a winner to start a private chat — a great way to connect with other players.',
    placement: 'top',
  },
  {
    id: 'start-quiz',
    page: 'home',
    target: 'tour-start-quiz',
    title: 'Full daily experience',
    description: 'Use Start Quiz for the complete trivia flow, instructions, and all challenge tiers.',
    placement: 'bottom',
  },
  {
    id: 'home-results',
    page: 'home',
    target: 'tour-home-results',
    title: 'Quiz results',
    description:
      'After you finish a run, your score summary appears here on the home feed so you can review correct answers and totals.',
    placement: 'bottom',
  },
  {
    id: 'support-card',
    page: 'home',
    target: 'tour-support',
    title: 'Customer support',
    description: 'Need help or app links? Open Contact Support from this card anytime.',
    placement: 'top',
  },
  {
    id: 'trivia-challenge',
    page: 'daily',
    target: 'tour-daily-challenge',
    title: 'Trivia Challenge',
    description:
      'Browse tiers with arrows or swipe on mobile. Tap the active card to flip for details — hover any card to pause auto-advance while you read.',
    placement: 'bottom',
  },
  {
    id: 'leaderboard',
    page: 'leaderboard',
    target: 'tour-leaderboard',
    title: 'Leaderboard',
    description: 'Switch between Rookie and Scholar draws, see rankings, and tap a player to view details or start a chat.',
    placement: 'bottom',
  },
  {
    id: 'wallet',
    page: 'wallet',
    target: 'tour-wallet',
    title: 'Wallet',
    description: 'Track your balance, withdrawals, subscription status, and payout history in one place.',
    placement: 'bottom',
  },
  {
    id: 'shop',
    page: 'shop',
    target: 'tour-shop',
    title: 'Shop',
    description: 'Buy gems and avatar cosmetics. Trivia tier subscriptions are purchased from Trivia Challenge checkout.',
    placement: 'bottom',
  },
  {
    id: 'profile',
    page: 'profile',
    target: 'tour-profile',
    title: 'Profile',
    description:
      'Your avatar, account info, password, and personal details live here — open Profile from the menu when you are signed in.',
    placement: 'bottom',
  },
  {
    id: 'chats',
    page: 'chats',
    target: 'tour-chats',
    title: 'Chats',
    description: 'Global room for everyone, or private threads with other players after you sign in.',
    placement: 'bottom',
  },
  {
    id: 'settings',
    page: 'settings',
    target: 'tour-settings',
    title: 'Settings',
    description: 'Notifications, sound, FAQs, support, app info — and replay this tour anytime from Settings.',
    placement: 'bottom',
  },
]
