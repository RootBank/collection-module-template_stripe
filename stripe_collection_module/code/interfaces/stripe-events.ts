/**
 * Stripe Event Types
 *
 * Enum of Stripe webhook event types we handle.
 * This is useful for event routing in webhook handlers.
 *
 * See: https://stripe.com/docs/api/events/types
 */

export const StripeEvents = {
  // Invoice events
  InvoiceCreated: 'invoice.created',
  InvoicePaid: 'invoice.paid',
  InvoicePaymentFailed: 'invoice.payment_failed',
  InvoiceVoided: 'invoice.voided',
  InvoiceMarkedUncollectible: 'invoice.marked_uncollectible',

  // Charge events
  ChargeRefunded: 'charge.refunded',
  ChargeDisputeFundsWithdrawn: 'charge.dispute.funds_withdrawn',

  // Subscription events
  SubscriptionScheduleUpdated: 'subscription_schedule.updated',

  // Payment Intent events
  PaymentIntentSucceeded: 'payment_intent.succeeded',
  PaymentIntentFailed: 'payment_intent.payment_failed',
  PaymentIntentCanceled: 'payment_intent.canceled',
} as const;

// Type for the event names
export type StripeEventType = (typeof StripeEvents)[keyof typeof StripeEvents];
