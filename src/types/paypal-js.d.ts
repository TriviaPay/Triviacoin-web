/** Minimal typings for PayPal JS SDK loaded at runtime. */
export {}

type PayPalActionsOrder = {
  create: (opts: Record<string, unknown>) => Promise<string>
}

type PayPalActionsSubscription = {
  create: (opts: { plan_id: string }) => Promise<string>
}

type PayPalActions = {
  order: PayPalActionsOrder
  subscription: PayPalActionsSubscription
}

type PayPalButtonOptions = {
  createOrder?: (data: unknown, actions: PayPalActions) => Promise<string>
  createSubscription?: (data: unknown, actions: PayPalActions) => Promise<string>
  onApprove?: (data: { orderID?: string; subscriptionID?: string }, actions: PayPalActions) => Promise<void>
  onCancel?: () => void
  onError?: (err: unknown) => void
  style?: Record<string, string | number | undefined>
}

type PayPalButtonsFactory = (opts: PayPalButtonOptions) => {
  render: (target: string | HTMLElement) => void
}

declare global {
  interface Window {
    paypal?: { Buttons: PayPalButtonsFactory }
  }
}
