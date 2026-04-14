export type TourPlacement = 'top' | 'bottom' | 'center'

export type OnboardingStep = {
  id: string
  /** `data-tour` attribute value; omit or empty for centered step */
  target?: string
  title: string
  description: string
  placement?: TourPlacement
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Trivia Coin',
    description:
      'Take a quick tour of the main spots: daily play, prize draws, and how to connect with other players.',
    placement: 'center',
  },
  {
    id: 'notifications',
    target: 'tour-notifications',
    title: 'Stay in the loop',
    description: 'Open notifications here for draws, rewards, and updates. The bell is right next to your daily bonus.',
    placement: 'bottom',
  },
  {
    id: 'sidebar-quiz',
    target: 'tour-sidebar-quiz',
    title: 'Play from Home',
    description:
      'Answer the free daily quiz in this panel: tap an option, then Submit. You can change your choice before submitting.',
    placement: 'bottom',
  },
  {
    id: 'winners',
    target: 'tour-winners',
    title: 'Recent winners',
    description:
      'See who won recent draws. Tap a winner to start a private chat — a great way to connect with other players.',
    placement: 'top',
  },
  {
    id: 'start-quiz',
    target: 'tour-start-quiz',
    title: 'Full daily experience',
    description: 'Use Start Quiz for the complete trivia flow, instructions, and all challenge tiers.',
    placement: 'bottom',
  },
]
