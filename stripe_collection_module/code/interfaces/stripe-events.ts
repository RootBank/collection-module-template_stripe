export const StripeEvents = {
  InvoiceCreated: 'invoice.created',
  InvoicePaid: 'invoice.paid',
  InvoicePaymentFailed: 'invoice.payment_failed',
  InvoiceVoided: 'invoice.voided',
  InvoiceMarkedUncollectible: 'invoice.marked_uncollectible',
  ChargeRefunded: 'charge.refunded',
  ChargeDisputeFundsWithdrawn: 'charge.dispute.funds_withdrawn',
  SubscriptionScheduleUpdated: 'subscription_schedule.updated',
  PaymentIntentSucceeded: 'payment_intent.succeeded',
  PaymentIntentFailed: 'payment_intent.payment_failed',
  PaymentIntentCanceled: 'payment_intent.canceled',
} as const;
