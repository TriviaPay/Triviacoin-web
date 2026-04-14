export interface FAQItem {
  question: string
  answer: string
}

/** Fallback when GET /faqs fails or returns empty (Settings loads live FAQs from the API). */
export const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I earn rewards?',
    answer:
      'You can earn rewards by participating in trivia games, completing daily challenges, and engaging with various activities in the app. The more you play, the more rewards you can accumulate!',
  },
  {
    question: 'How do I redeem my rewards?',
    answer:
      'To redeem your rewards, go to the Shop section and browse available items. Select the item you want and use your accumulated gems or points to purchase it.',
  },
  {
    question: 'What are gems and how do I get them?',
    answer:
      'Gems are the virtual currency in the app. You can earn gems by playing games, completing daily bonuses, winning trivia contests, and participating in special events.',
  },
  {
    question: 'How do I update my profile?',
    answer:
      'You can update your profile by going to the Profile section. From there, you can edit your personal information, change your profile picture, and update your account settings.',
  },
  {
    question: 'How do I change my password?',
    answer:
      'To change your password, go to Profile settings and select the Change Password option. You will need to enter your current password and then set a new one.',
  },
  {
    question: 'Can I play offline?',
    answer:
      'Some features require an internet connection, but you can access certain parts of the app offline. For the best experience, we recommend using the app with an active internet connection.',
  },
  {
    question: 'How do I report a problem?',
    answer:
      'If you encounter any issues, you can contact our customer support team through the Customer Support option in Settings. We will respond to your inquiry as soon as possible.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'To delete your account, please contact our customer support team through the Customer Support option in Settings. Our team will assist you with the account deletion process.',
  },
]

/** Display version (aligned with mobile app release; update when shipping). */
export const CURRENT_APP_VERSION = '1.0.5'
