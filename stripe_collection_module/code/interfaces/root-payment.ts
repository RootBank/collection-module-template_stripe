export const Metadata = {
  policyId: undefined as string | undefined,
};

export const FailureAction = {
  BlockRetry: 'block_retry',
  BlockPaymentMethod: 'block_payment_method',
  AllowRetry: 'allow_retry',
} as const;

export const RootPaymentType = {
  Premium: 'premium',
  Reversal: 'reversal',
  ClaimPayout: 'claim_payout',
  PremiumRefund: 'premium_refund',
  Other: 'other',
} as const;

export const RootPremiumType = {
  Recurring: 'recurring',
  Arrears: 'arrears',
  AdHoc: 'ad_hoc',
  ProRata: 'pro_rata',
  CoverPeriod: 'cover_period',
} as const;

export const PaymentStatus = {
  Pending: 'pending',
  Submitted: 'submitted',
  Processing: 'processing',
  Failed: 'failed',
  Successful: 'successful',
  Cancelled: 'cancelled',
} as const;

export const RootPayment = {
  payment_id: undefined as string | undefined,
  payment_method_id: undefined as string | undefined,
  status: undefined as string | undefined,
  amount: undefined as number | undefined,
  description: undefined as string | undefined,
  payment_date: undefined as string | undefined,
  finalized_at: undefined as string | undefined,
  external_reference: undefined as string | undefined,
  payment_type: undefined as keyof typeof RootPaymentType | undefined,
  premium_type: undefined as keyof typeof RootPremiumType | undefined,
  policy_id: undefined as string | undefined,
  failure_reason: undefined as string | undefined,
  failure_action: undefined as keyof typeof FailureAction | undefined,
} as const;
