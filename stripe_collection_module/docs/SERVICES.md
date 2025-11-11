# Services

This directory contains business logic services that orchestrate operations across clients, adapters, and utilities. Services form the core business layer of the application.

## Architecture

```
Controllers → Services → Clients
```

Services encapsulate business logic and:
- Coordinate multiple operations
- Transform data between systems
- Implement business rules
- Handle complex workflows
- Testable via dependency injection

## Available Services

### LogService

Structured JSON logging to stdout for log aggregation systems.

**Location**: `log.service.ts`

**Key Features**:
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Correlation IDs for request tracking
- Structured JSON output
- Environment context

**Usage**:

```typescript
import { getLogService } from '../services/log-instance';

const logService = getLogService();

// Basic logging
logService.info('Operation completed', 'MyService');
logService.error('Operation failed', 'MyService', {}, error);

// With metadata
logService.info('Payment created', 'PaymentService', {
  paymentId: 'payment_123',
  amount: 10000,
});

// With correlation ID
const correlationId = logService.generateCorrelationId();
logService.info('Processing request', 'WebhookHandler');
// ... all subsequent logs will include this correlation ID
logService.clearCorrelationId();
```

**Configuration**:

```typescript
new LogService({
  environment: 'production',
  minLogLevel: LogLevel.INFO, // Filter out DEBUG logs
});
```

### ConfigurationService

Type-safe, validated configuration management with environment-specific settings.

**Location**: `config.service.ts`

**Key Features**:
- Environment-specific configs (production/development)
- Validation on startup
- Type-safe access
- Injectable for testing

**Usage**:

```typescript
import { getConfigService } from '../services/config-instance';

const config = getConfigService();

// Get individual config values
const apiKey = config.get('stripeSecretKey');
const baseUrl = config.get('rootBaseUrl');

// Check environment
if (config.isProduction()) {
  // Production-specific logic
}

// Get all config
const allConfig = config.getAll();
```

**Available Configuration**:
- `stripeSecretKey`
- `stripePublishableKey`
- `stripeWebhookSigningSecret`
- `stripeProductId`
- `rootApiKey`
- `rootBaseUrl`
- `rootCollectionModuleKey`
- `environment`

### RenderService

HTML generation for Root Platform dashboard views.

**Location**: `render.service.ts`

**Key Features**:
- Payment method forms with Stripe Elements
- Payment method summary views
- Payment method detail views
- XSS protection via HTML escaping

**Usage**:

```typescript
import { RenderService } from '../services/render.service';

const renderService = new RenderService();

// Render payment method creation form
const html = renderService.renderCreatePaymentMethod({
  stripePublishableKey: 'pk_test_...',
  setupIntentClientSecret: 'seti_...',
});

// Render payment method summary
const summaryHtml = renderService.renderViewPaymentMethodSummary({
  payment_method: paymentMethod,
  paymentMethodDetails: {
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
  },
});

// Render full payment method view
const detailHtml = renderService.renderViewPaymentMethod({
  payment_method: paymentMethod,
  policy: policy,
});
```

### RootService

Business logic for Root Platform operations.

**Location**: `root.service.ts`

**Key Features**:
- Policy management
- Payment operations
- Type-safe wrappers around Root SDK
- Error handling and logging

**Usage**:

```typescript
import { RootService } from '../services/root.service';
import { PaymentStatus } from '@rootplatform/node-sdk';

const rootService = new RootService(logService);

// Get policy
const policy = await rootService.getPolicy('policy_123');

// Update payment status
await rootService.updatePaymentStatus({
  paymentId: 'payment_456',
  status: PaymentStatus.Successful,
});
```

### StripeService

Business logic for Stripe operations.

**Location**: `stripe.service.ts`

**Key Features**:
- Customer management (create, get, update)
- Payment intent creation
- Payment method operations (get, attach)
- Subscription management
- Type-safe wrappers around Stripe SDK
- Error handling and logging

**Usage**:

```typescript
import { StripeService } from '../services/stripe.service';

const stripeService = new StripeService(logService);

// Create customer
const customer = await stripeService.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  metadata: { root_policy_id: 'policy_123' },
});

// Create payment intent
const paymentIntent = await stripeService.createPaymentIntent({
  amount: 10000,
  currency: 'zar',
  customerId: customer.id,
  description: 'Premium payment',
  metadata: { root_payment_id: 'payment_456' },
  confirm: true,
  offSession: true,
});

// Attach payment method to customer
const paymentMethod = await stripeService.attachPaymentMethod({
  paymentMethodId: 'pm_123',
  customerId: customer.id,
});

// Update customer
await stripeService.updateCustomer(customer.id, {
  invoice_settings: {
    default_payment_method: 'pm_123',
  },
});

// Cancel subscription
await stripeService.cancelSubscription('sub_123');
```

## Service Helper Instances

For convenience, some services provide instance helper functions:

### log-instance.ts

```typescript
import { getLogService } from '../services/log-instance';

// Get singleton instance
const logService = getLogService();

// Check if initialized
if (isLogServiceInitialized()) {
  // Use log service
}
```

### config-instance.ts

```typescript
import { getConfigService } from '../services/config-instance';

// Get singleton instance
const config = getConfigService();

// Check if initialized
if (isConfigServiceInitialized()) {
  // Use config service
}
```

## Creating a New Service

When you need to add new business logic:

### 1. Create Service File

```typescript
// services/my-feature.service.ts
import { LogService } from './log.service';
import StripeClient from '../clients/stripe-client';
import { RootService } from './root.service';

export class MyFeatureService {
  constructor(
    private readonly logService: LogService,
    private readonly stripeClient: StripeClient,
    private readonly rootService: RootService
  ) {}

  async performOperation(params: OperationParams): Promise<Result> {
    this.logService.info('Starting operation', 'MyFeatureService', params);

    try {
      // 1. Fetch data from Stripe
      const stripeData = await this.stripeClient.stripeSDK.someMethod();

      // 2. Transform data
      const transformed = this.transformData(stripeData);

      // 3. Update Root
      await this.rootService.updateSomething(transformed);

      this.logService.info('Operation completed', 'MyFeatureService');
      return result;
    } catch (error: any) {
      this.logService.error(
        'Operation failed',
        'MyFeatureService',
        { params },
        error
      );
      throw error;
    }
  }

  private transformData(data: any) {
    // Business logic here
    return transformed;
  }
}
```

### 2. Register in DI Container

```typescript
// core/container.setup.ts
container.register(
  ServiceToken.MY_FEATURE_SERVICE,
  (c) => {
    const logService = c.resolve<LogService>(ServiceToken.LOG_SERVICE);
    const rootService = c.resolve(ServiceToken.ROOT_SERVICE);
    const stripeClient = new StripeClient();

    const { MyFeatureService } = require('../services/my-feature.service');
    return new MyFeatureService(logService, stripeClient, rootService);
  },
  ServiceLifetime.SINGLETON
);
```

### 3. Use in Controllers

```typescript
import { getContainer } from '../core/container.setup';
import { ServiceToken } from '../core/container';

const container = getContainer();
const myFeatureService = container.resolve(ServiceToken.MY_FEATURE_SERVICE);

await myFeatureService.performOperation(params);
```

## Testing Services

Services are designed for easy testing with dependency injection:

```typescript
import { MyFeatureService } from '../services/my-feature.service';
import { LogService } from '../services/log.service';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let mockLogService: jest.Mocked<LogService>;
  let mockStripeClient: jest.Mocked<StripeClient>;
  let mockRootService: jest.Mocked<RootService>;

  beforeEach(() => {
    // Create mocks
    mockLogService = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    } as any;

    mockStripeClient = {
      stripeSDK: {
        customers: {
          retrieve: jest.fn(),
        },
      },
    } as any;

    mockRootService = {
      updatePaymentStatus: jest.fn(),
    } as any;

    // Inject mocks
    service = new MyFeatureService(
      mockLogService,
      mockStripeClient,
      mockRootService
    );
  });

  it('should perform operation successfully', async () => {
    // Arrange
    mockStripeClient.stripeSDK.customers.retrieve.mockResolvedValue({
      id: 'cus_123',
    });

    // Act
    const result = await service.performOperation({ id: '123' });

    // Assert
    expect(result).toBeDefined();
    expect(mockLogService.info).toHaveBeenCalledWith(
      'Starting operation',
      'MyFeatureService',
      { id: '123' }
    );
  });

  it('should handle errors gracefully', async () => {
    // Arrange
    const error = new Error('API failed');
    mockStripeClient.stripeSDK.customers.retrieve.mockRejectedValue(error);

    // Act & Assert
    await expect(service.performOperation({ id: '123' })).rejects.toThrow();
    expect(mockLogService.error).toHaveBeenCalled();
  });
});
```

## Best Practices

### Do ✅

- Inject all dependencies via constructor
- Use LogService for all logging
- Return domain objects, not raw API responses
- Handle errors with context
- Keep services focused (single responsibility)
- Write unit tests with mocked dependencies
- Document public methods with JSDoc

### Don't ❌

- Create dependencies with `new` inside service (except clients)
- Mix infrastructure concerns with business logic
- Catch errors without logging
- Skip input validation
- Create global state/singletons (use DI container)
- Expose internal implementation details
- Skip error handling

## Service Patterns

### Orchestration Pattern

```typescript
// Service coordinates multiple operations
async createCustomerAndSubscription(policy: Policy) {
  // 1. Create customer
  const customer = await this.stripeClient.stripeSDK.customers.create({
    email: policy.email,
  });

  // 2. Attach payment method
  await this.stripeClient.stripeSDK.paymentMethods.attach(
    paymentMethodId,
    { customer: customer.id }
  );

  // 3. Create subscription
  const subscription = await this.stripeClient.stripeSDK.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
  });

  // 4. Update Root
  await this.rootService.updatePolicyAppData(policy.policy_id, {
    stripe_customer_id: customer.id,
    stripe_subscription_id: subscription.id,
  });

  return { customer, subscription };
}
```

### Transformation Pattern

```typescript
// Service transforms data between systems
async syncPaymentStatus(stripeInvoice: Stripe.Invoice, rootPaymentId: string) {
  // Transform Stripe data to Root format
  const status = this.mapStripeStatusToRoot(stripeInvoice.status);
  const failureReason = stripeInvoice.last_finalization_error?.message;

  // Update Root
  await this.rootService.updatePaymentStatus({
    paymentId: rootPaymentId,
    status,
    failureReason,
  });
}

private mapStripeStatusToRoot(stripeStatus: string): PaymentStatus {
  const mapping = {
    paid: PaymentStatus.Successful,
    open: PaymentStatus.Pending,
    void: PaymentStatus.Cancelled,
    uncollectible: PaymentStatus.Failed,
  };
  return mapping[stripeStatus] || PaymentStatus.Failed;
}
```

## Related Documentation

- [Clients Documentation](../clients/README.md) - Using API clients
- [Controllers Documentation](../controllers/README.md) - Calling services from controllers
- [Core/DI Container](../core/README.md) - Dependency injection patterns
- [Testing Guide](../../docs/TESTING.md) - Testing services
- [Best Practices](../../docs/BEST_PRACTICES.md) - Service design patterns

