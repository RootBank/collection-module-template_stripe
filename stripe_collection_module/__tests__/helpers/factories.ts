/**
 * Test data factories
 * Create mock objects for testing
 */

import Stripe from 'stripe';

/**
 * Create a mock Stripe customer
 */
export const createMockStripeCustomer = (
  overrides?: Partial<Stripe.Customer>
): Stripe.Customer => {
  return {
    id: 'cus_test_123',
    object: 'customer',
    created: Date.now() / 1000,
    email: 'test@example.com',
    name: 'Test Customer',
    description: 'Test customer for unit tests',
    livemode: false,
    metadata: {},
    ...overrides,
  } as Stripe.Customer;
};

/**
 * Create a mock Stripe payment method
 */
export const createMockStripePaymentMethod = (
  overrides?: Partial<Stripe.PaymentMethod>
): Stripe.PaymentMethod => {
  return {
    id: 'pm_test_123',
    object: 'payment_method',
    created: Date.now() / 1000,
    type: 'card',
    livemode: false,
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
      funding: 'credit',
      checks: null,
      country: 'US',
      fingerprint: 'test_fingerprint',
      generated_from: null,
      networks: null,
      three_d_secure_usage: null,
      wallet: null,
    },
    billing_details: {
      address: null,
      email: null,
      name: null,
      phone: null,
    },
    metadata: {},
    ...overrides,
  } as Stripe.PaymentMethod;
};

/**
 * Create a mock Stripe subscription
 */
export const createMockStripeSubscription = (
  overrides?: Partial<Stripe.Subscription>
): Stripe.Subscription => {
  return {
    id: 'sub_test_123',
    object: 'subscription',
    created: Date.now() / 1000,
    current_period_start: Date.now() / 1000,
    current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60,
    customer: 'cus_test_123',
    status: 'active',
    items: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/subscription_items',
    },
    metadata: {},
    ...overrides,
  } as Stripe.Subscription;
};

/**
 * Create a mock Stripe invoice
 */
export const createMockStripeInvoice = (
  overrides?: Partial<Stripe.Invoice>
): Stripe.Invoice => {
  return {
    id: 'in_test_123',
    object: 'invoice',
    created: Date.now() / 1000,
    customer: 'cus_test_123',
    status: 'paid',
    amount_due: 10000,
    amount_paid: 10000,
    amount_remaining: 0,
    currency: 'zar',
    lines: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/invoices/in_test_123/lines',
    },
    metadata: {},
    ...overrides,
  } as Stripe.Invoice;
};

/**
 * Create a mock Root policy
 */
export const createMockRootPolicy = (overrides?: any): any => {
  return {
    policy_id: 'policy_test_123',
    policy_number: 'TEST-12345',
    policyholder_id: 'policyholder_test_123',
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2025-01-01T00:00:00Z',
    monthly_premium: 50000, // in cents
    currency: 'ZAR',
    billing_frequency: 'monthly',
    billing_day: 1,
    app_data: {},
    ...overrides,
  };
};

/**
 * Create a mock Root payment method
 */
export const createMockRootPaymentMethod = (overrides?: any): any => {
  return {
    payment_method_id: 'pm_root_test_123',
    collection_module_key: 'test_collection_module',
    collection_module_definition_id: 'cmd_test_123',
    module: {
      id: 'si_test_123',
      usage: 'off_session',
      object: 'setup_intent',
      status: 'succeeded',
      livemode: false,
      payment_method: 'pm_test_123',
    },
    ...overrides,
  };
};

/**
 * Create a mock Root payment
 */
export const createMockRootPayment = (overrides?: any): any => {
  return {
    payment_id: 'payment_test_123',
    policy_id: 'policy_test_123',
    amount: 50000, // in cents
    currency: 'ZAR',
    status: 'pending',
    payment_type: 'premium',
    payment_date: '2024-01-01T00:00:00Z',
    description: 'Test payment',
    external_reference: 'ext_ref_123',
    ...overrides,
  };
};
