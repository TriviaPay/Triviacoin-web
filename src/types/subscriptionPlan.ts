/** GET /store/subscriptions — normalized row for Trivia Challenge cards. */
export type SubscriptionPlan = {
  productId: string
  name: string
  priceMinor: number
  currency: string
  interval: string
  features: string[]
}
