# API Clients

This directory contains client wrappers for external APIs (Stripe and Root Platform). Clients provide a clean interface for making API calls with proper error handling, configuration, and type safety.

## Architecture

```
Controllers → Services → Clients → External APIs
```

Clients are thin wrappers around SDK/API libraries that handle:
- Configuration injection
- Error transformation
- Type safety
- Common API patterns

## Available Clients

### StripeClient

Wrapper around the Stripe Node.js SDK with helper methods for common operations.

**Location**: `stripe-client.ts`

**Usage**:

```typescript
import StripeClient from '../clients/stripe-client';

const stripeClient = new StripeClient();

// Access Stripe SDK directly
const customer = await stripeClient.stripeSDK.customers.create({
  email: 'customer@example.com',
  name: 'John Doe',
});

// Create setup intent
const setupIntent = await stripeClient.stripeSDK.setupIntents.create({});

// Create payment intent
const paymentIntent = await stripeClient.stripeSDK.paymentIntents.create({
  amount: 10000,
  currency: 'zar',
  customer: 'cus_123',
});
```

**Configuration**:
- Automatically retrieves `stripeSecretKey` from ConfigurationService
- Uses environment-specific keys (test/live)

### RootClient

Singleton wrapper around the Root Platform SDK.

**Location**: `root-client.ts`

**Usage**:

```typescript
import rootClient from '../clients/root-client';

// Get policy
const policy = await rootClient.SDK.getPolicyById({ 
  policyId: 'policy_123' 
});

// Update payment
await rootClient.SDK.updatePaymentsAsync({
  paymentUpdates: [{
    payment_id: 'payment_456',
    status: 'successful',
  }],
});

// Create payment
const payment = await rootClient.SDK.createPolicyPayment({
  policyId: 'policy_123',
  paymentCreate: {
    amount: 10000,
    description: 'Premium payment',
    payment_date: '2024-01-15',
    payment_type: 'premium',
    status: 'pending',
  },
});
```

**Configuration**:
- Automatically retrieves `rootApiKey` and `rootBaseUrl` from ConfigurationService
- Uses environment-specific endpoints (sandbox/production)

**Note**: RootClient is a singleton - import the default export, don't instantiate with `new`.

## Error Handling

Handle Stripe SDK errors in your services:

```typescript
try {
  const customer = await stripeClient.stripeSDK.customers.create(params);
} catch (error: any) {
  logService.error('Failed to create customer', 'MyService', { params }, error);
  throw error;
}
```

## Testing

### Mocking StripeClient

```typescript
import StripeClient from '../clients/stripe-client';

// Mock the entire client
jest.mock('../clients/stripe-client');

const mockStripeClient = {
  stripeSDK: {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_123' }),
    },
    paymentIntents: {
      create: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
  },
} as unknown as jest.Mocked<StripeClient>;
```

### Mocking RootClient

```typescript
import rootClient from '../clients/root-client';

// Mock the singleton
jest.mock('../clients/root-client', () => ({
  default: {
    SDK: {
      getPolicyById: jest.fn(),
      updatePaymentsAsync: jest.fn(),
      createPolicyPayment: jest.fn(),
    },
  },
}));

// Use in tests
(rootClient.SDK.getPolicyById as jest.Mock).mockResolvedValue({
  policy_id: 'policy_123',
  // ... other policy data
});
```

## Creating a New Client

When integrating with a new external API:

### 1. Create Client File

```typescript
// clients/my-api-client.ts
import { MyAPISDK } from 'my-api-sdk';
import { getConfigService } from '../services/config-instance';
import ModuleError from '../utils/error';

export default class MyAPIClient {
  public sdk: MyAPISDK;

  constructor() {
    const config = getConfigService();
    this.sdk = new MyAPISDK({
      apiKey: config.get('myApiKey'),
      baseUrl: config.get('myApiBaseUrl'),
    });
  }

  // Access SDK directly - error handling done in services
  // No need to wrap every method
}
}
```

### 2. Add Configuration

Update `config.service.ts` to include the new API credentials:

```typescript
export interface EnvironmentConfig {
  // ... existing config
  myApiKey: string;
  myApiBaseUrl: string;
}
```

### 3. Add Environment Variables

Update `env.ts` and `env.sample.ts`:

```typescript
export const MY_API_KEY = process.env.MY_API_KEY || '';
export const MY_API_BASE_URL = process.env.MY_API_BASE_URL || '';
```

### 4. Use in Services

```typescript
import MyAPIClient from '../clients/my-api-client';

export class MyService {
  constructor(
    private readonly logService: LogService,
    private readonly myApiClient: MyAPIClient
  ) {}

  async performOperation() {
    const result = await this.myApiClient.doSomething({ ... });
    return result;
  }
}
```

## Best Practices

### Do ✅

- Keep clients thin - expose the SDK
- Use ConfigurationService for credentials
- Document usage patterns
- Add TypeScript types where needed
- Initialize SDK in constructor

### Don't ❌

- Put business logic in clients
- Create multiple instances unnecessarily
- Expose credentials directly
- Make clients stateful
- Wrap every SDK method

## Types

Use Stripe's built-in TypeScript types:

```typescript
import Stripe from 'stripe';

// Stripe SDK provides comprehensive types
const params: Stripe.CustomerCreateParams = {
  email: 'customer@example.com',
  name: 'John Doe',
};
```

## Related Documentation

- [Services Documentation](../services/README.md) - Using clients in services
- [Configuration](../../docs/ROOT_CONFIGURATION.md) - Setting up API credentials
- [Error Handling](../../docs/BEST_PRACTICES.md#error-handling) - Error patterns
- [Testing Guide](../../docs/TESTING.md) - Testing with mocked clients

