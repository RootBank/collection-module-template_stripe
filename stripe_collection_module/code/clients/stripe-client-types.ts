import Stripe from 'stripe';

export interface CreatePriceParams {
  stripeProductId: string;
  currency: string;
  priceAmountInCents: number;
  billingFrequency: 'monthly' | 'yearly' | 'once_off';
}

export const PriceIntervals: Record<
  string,
  Stripe.PriceCreateParams.Recurring | undefined
> = {
  monthly: { interval: 'month' },
  yearly: { interval: 'year' },
  once_off: undefined,
};

export interface CreateSubscriptionScheduleParams {
  stripeCustomerId: string;
  rootPolicyId: string;
  rootPolicyNumber: string;
  rootPolicyStartDate: string;
  rootPolicyEndDate?: string;
  billingFrequency: 'monthly' | 'yearly' | 'once_off';
  stripePriceId: string;
  prorationBehavior: 'none';
}

export interface UpdateSubscriptionParams {
  subscriptionItemId: string;
  stripePriceId: string;
  prorationBehavior: string;
}
