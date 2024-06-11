export enum Environment {
  Sandbox = 'sandbox',
  Production = 'production',
}

export interface Policy {
  policy_id: string;
  app_data: any;
}

export enum PaymentCollectionType {
  DebitOrderSameDay = 'debit_order_same_day',
  DebitOrderTwoDay = 'debit_order_two_day',
  DebitOrderOneDay = 'debit_order_one_day',
  DebitOrderNaedo = 'debit_order_naedo',
  DebitOrderDebiCheck = 'debit_order_debicheck',
  RealTimeClearing = 'real_time_clearing',
  RealTimeLine = 'real_time_line',
  Card = 'card',
  External = 'external',
  CollectionModule = 'collection_module',
  Other = 'other',
}
export interface RootPayment {
  payment_id?: string;
  organization_id?: string;
  environment?: Environment;
  created_at?: string;
  external_reference: string;
  payment_type?: string;
  payment_date?: string;
  premium_type?: string;
  finalized_at?: string;
  payment_method_id: string;
  status: PaymentStatus;
  amount: number;
  description?: string;
  failureReason?: string;
}
export enum PaymentStatus {
  Pending = 'pending',
  Submitted = 'submitted',
  Processing = 'processing',
  Failed = 'failed',
  Successful = 'successful',
  Cancelled = 'cancelled',
}

export enum RootPaymentType {
  Premium = 'premium',
  Reversal = 'reversal',
  ClaimPayout = 'claim_payout',
  PremiumRefund = 'premium_refund',
  Other = 'other',
}

export enum RootPremiumType {
  Recurring = 'recurring',
  Arrears = 'arrears',
  AdHoc = 'ad_hoc',
  ProRata = 'pro_rata',
  CoverPeriod = 'cover_period',
}

export enum StripeEvents {
  InvoiceCreated = 'invoice.created',
  InvoicePaid = 'invoice.paid',
  InvoicePaymentFailed = 'invoice.payment_failed',
  InvoiceVoided = 'invoice.voided',
  InvoiceMarkedUncollectible = 'invoice.marked_uncollectible',
  ChargeRefunded = 'charge.refunded',
  ChargeDisputeFundsWithdrawn = 'charge.dispute.funds_withdrawn',
  SubscriptionScheduleUpdated = 'subscription_schedule.updated',
  PaymentIntentSucceeded = 'payment_intent.succeeded',
  PaymentIntentFailed = 'payment_intent.payment_failed',
  PaymentIntentCanceled = 'payment_intent.canceled',
}
