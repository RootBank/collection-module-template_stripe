/**
 * Test Helpers
 * 
 * Centralized mock factories and test utilities to reduce duplication
 */

/**
 * Create a mock LogService
 * Common across controller and service tests
 */
export function createMockLogService() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    generateCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
  };
}

/**
 * Create a mock ConfigService
 * Returns test environment variables
 */
export function createMockConfigService() {
  return {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        environment: 'test',
        stripeSecretKey: 'sk_test_123',
        stripePublishableKey: 'pk_test_123',
        stripeWebhookSigningSecret: 'whsec_test_secret',
        rootApiKey: 'test_root_key',
        rootBaseUrl: 'https://test.root.co.za',
      };
      return config[key] || null;
    }),
  };
}

/**
 * Setup mock for config-instance module
 * Call this in beforeEach when you need to mock getConfigService
 */
export function setupConfigMock() {
  const { getConfigService } = require('../code/services/config-instance');
  getConfigService.mockReturnValue(createMockConfigService());
}

/**
 * Create a mock Stripe SDK
 * Common structure used across Stripe tests
 */
export function createMockStripeSDK() {
  return {
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    paymentMethods: {
      retrieve: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
    },
    subscriptions: {
      cancel: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  };
}

/**
 * Create a mock Root SDK/Client
 * The RootClient exports the SDK namespace directly, so mock functions should be at the top level
 */
export function createMockRootClient() {
  return {
    getPolicyById: jest.fn(),
    updatePaymentsAsync: jest.fn(),
    getPolicyPaymentMethod: jest.fn(),
    updatePolicy: jest.fn(),
  };
}

/**
 * Create a mock StripeClient
 */
export function createMockStripeClient() {
  return {
    stripeSDK: createMockStripeSDK(),
  };
}

/**
 * Create a mock RootService
 */
export function createMockRootService() {
  return {
    getPolicy: jest.fn(),
    updatePaymentStatus: jest.fn(),
  };
}
