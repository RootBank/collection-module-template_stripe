export const BANVStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Verified: 'verified',
  FailedVerification: 'failed_verification',
  Blocked: 'blocked',
} as const;

export const RootEvents = {
  policyCancelled: 'policyCancelled',
  policyLapsed: 'policyLapsed',
  paymentMethodAssigned: 'paymentMethodAssigned',
  paymentMethodRemoved: 'paymentMethodRemoved',
  alterationPackageApplied: 'alterationPackageApplied',
} as const;

export const RootPaymentStatuses = {
  pending: 'pending',
  submitted: 'submitted',
  processing: 'processing',
  failed: 'failed',
  successful: 'successful',
  cancelled: 'cancelled',
} as const;

export const RootPaymentTypes = {
  premium: 'premium',
  premiumRefund: 'premium_refund',
} as const;

export const PaymentMethodType = {
  DebitOrder: 'debit_order',
  Card: 'card',
  Eft: 'eft',
  External: 'external',
} as const;

export const PaymentCollectionType = {
  DebitOrderSameDay: 'debit_order_same_day',
  DebitOrderTwoDay: 'debit_order_two_day',
  DebitOrderOneDay: 'debit_order_one_day',
  DebitOrderNaedo: 'debit_order_naedo',
  DebitOrderDebiCheck: 'debit_order_debicheck',
  RealTimeClearing: 'real_time_clearing',
  RealTimeLine: 'real_time_line',
  Card: 'card',
  External: 'external',
  CollectionModule: 'collection_module',
  Other: 'other',
} as const;

export const RootFailureActions = {
  BlockRetry: 'block_retry',
  BlockPaymentMethod: 'block_payment_method',
  AllowRetry: 'allow_retry',
} as const;

export const RootPremiumTypes = {
  recurring: 'recurring',
} as const;
