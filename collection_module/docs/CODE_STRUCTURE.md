# Code Structure Guide

This document provides an overview of the codebase organization and links to detailed documentation for each area.

## Directory Overview

```
stripe_collection_module/
├── code/                          # Source code
│   ├── adapters/                  # Data transformation layer
│   ├── clients/                   # External API wrappers
│   ├── controllers/               # Event processors & orchestration
│   ├── core/                      # DI container & infrastructure
│   ├── interfaces/                # TypeScript interfaces
│   ├── lifecycle-hooks/           # Root Platform callbacks
│   ├── services/                  # Business logic layer
│   ├── utils/                     # Utility functions
│   ├── main.ts                    # Entry point
│   └── webhook-hooks.ts           # Stripe webhook handler
│
├── __tests__/                     # Test files
│   ├── core/                      # Core tests
│   ├── helpers/                   # Test utilities
│   ├── lifecycle-hooks/           # Hook tests
│   └── services/                  # Service tests
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # System architecture
│   ├── BEST_PRACTICES.md          # Coding guidelines
│   ├── CODE_STRUCTURE.md          # This file
│   ├── CUSTOMIZING.md             # Implementation guide
│   ├── DEPLOYMENT.md              # Deployment guide
│   ├── LOG_VIEWING.md             # Logging guide
│   ├── ROOT_CONFIGURATION.md      # Root Platform config
│   ├── SETUP.md                   # Setup instructions
│   ├── TESTING.md                 # Testing guide
│   └── WEBHOOKS.md                # Webhook guide
│
└── scripts/                       # Deployment scripts
    ├── deploy.sh                  # Deployment automation
    └── validate-config.sh         # Config validation
```

## Code Organization

### Layer Architecture

The codebase follows a clean layered architecture:

```
┌─────────────────────────────────────────┐
│  Entry Points (main.ts, webhook-hooks)  │
├─────────────────────────────────────────┤
│  Lifecycle Hooks & Controllers          │ ← Orchestration layer
├─────────────────────────────────────────┤
│  Services                                │ ← Business logic layer
├─────────────────────────────────────────┤
│  Adapters & Clients                      │ ← Infrastructure layer
├─────────────────────────────────────────┤
│  External APIs (Stripe, Root)            │
└─────────────────────────────────────────┘
```

Each layer has a specific responsibility and only depends on layers below it.

## Detailed Documentation

### 📁 [Adapters](../code/adapters/README.md)

Data transformation between Stripe and Root formats.

**Key Topics**:
- What are adapters and when to use them
- StripeToRootAdapter usage examples
- Creating custom adapters
- Testing adapters

**Quick Example**:
```typescript
import StripeToRootAdapter from './adapters/stripe-to-root-adapter';

const adapter = new StripeToRootAdapter();
const rootPayment = adapter.convertInvoiceToRootPayment(invoice, {
  status: PaymentStatus.Successful,
});
```

---

### 📁 [Clients](../code/clients/README.md)

Thin wrappers around external API SDKs.

**Key Topics**:
- StripeClient configuration and usage
- RootClient singleton pattern
- Error handling in clients
- Testing with mocked clients
- Creating new API clients

**Quick Example**:
```typescript
import StripeClient from './clients/stripe-client';
import rootClient from './clients/root-client';

const stripeClient = new StripeClient();
const customer = await stripeClient.stripeSDK.customers.create({...});

const policy = await rootClient.SDK.getPolicyById({ policyId: 'pol_123' });
```

---

### 📁 [Controllers](../code/controllers/README.md)

Event processors that orchestrate service calls.

**Key Topics**:
- Controller architecture and patterns
- Stripe webhook event processors
- Root lifecycle event processors
- Dependency injection in controllers
- Creating new controllers
- Testing controllers

**Quick Example**:
```typescript
export class InvoicePaidController {
  constructor(
    private readonly logService: LogService,
    private readonly rootService: RootService
  ) {}

  async handle(invoice: Stripe.Invoice): Promise<void> {
    // Orchestrate the workflow
  }
}
```

---

### 📁 [Core](../code/core/README.md)

Dependency injection container and infrastructure.

**Key Topics**:
- DI container usage
- Service registration patterns
- Service tokens
- Singleton vs Transient lifetimes
- Testing with DI container

**Quick Example**:
```typescript
import { getContainer } from './core/container.setup';
import { ServiceToken } from './core/container';

const container = getContainer();
const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
```

---

### 📁 [Lifecycle Hooks](../code/lifecycle-hooks/README.md)

Root Platform callback functions.

**Key Topics**:
- What are lifecycle hooks
- Available hook functions
- Payment method hooks
- Policy lifecycle hooks
- Payment lifecycle hooks
- Implementation patterns
- Testing hooks

**Quick Example**:
```typescript
export async function afterPolicyPaymentMethodAssigned({ policy }) {
  // React to payment method assignment
  await assignPaymentMethodToStripe(policy);
}
```

---

### 📁 [Services](../code/services/README.md)

Business logic and domain operations.

**Key Topics**:
- Service layer overview
- LogService - structured logging
- ConfigurationService - type-safe config
- RenderService - HTML generation
- RootService - Root Platform operations
- Creating custom services
- Testing services

**Quick Example**:
```typescript
export class RootService {
  constructor(private readonly logService: LogService) {}

  async updatePaymentStatus(params: UpdateParams): Promise<void> {
    // Business logic here
  }
}
```

---

### 📁 [Utils](../code/utils/README.md)

Reusable utility functions and helpers.

**Key Topics**:
- Error types and handling
- Retry logic with exponential backoff
- Timeout utilities
- Error categorization
- Best practices

**Quick Example**:
```typescript
import { retryWithBackoff, withTimeout } from './utils';

const result = await retryWithBackoff(
  () => externalApiCall(),
  { maxRetries: 3 }
);
```

---

## Cross-Cutting Concerns

### Configuration

Configuration is managed centrally:
- **Source**: `code/env.ts` - Environment variables
- **Service**: `code/services/config.service.ts` - Type-safe access
- **Documentation**: [ROOT_CONFIGURATION.md](./ROOT_CONFIGURATION.md)

### Logging

Structured logging throughout:
- **Service**: `code/services/log.service.ts` - LogService
- **Output**: JSON to stdout (CloudWatch/DataDog)
- **Documentation**: [LOG_VIEWING.md](./LOG_VIEWING.md)

### Error Handling

Consistent error handling:
- **Errors**: `code/utils/error.ts` and `error-types.ts`
- **Pattern**: Catch, log, re-throw with context
- **Documentation**: [BEST_PRACTICES.md](./BEST_PRACTICES.md#error-handling)

### Testing

Comprehensive test coverage:
- **Location**: `__tests__/` directory
- **Pattern**: Unit tests with mocked dependencies
- **Documentation**: [TESTING.md](./TESTING.md)

## Common Workflows

### Adding a New Feature

1. **Create Service** (if needed)
   - Add business logic in `code/services/`
   - See: [Services README](../code/services/README.md)

2. **Create Controller** (if handling events)
   - Add event processor in `code/controllers/`
   - See: [Controllers README](../code/controllers/README.md)

3. **Register in DI Container**
   - Update `code/core/container.setup.ts`
   - See: [Core README](../code/core/README.md)

4. **Wire in Entry Point**
   - Update `code/webhook-hooks.ts` or `code/lifecycle-hooks/`
   - See: [Lifecycle Hooks README](../code/lifecycle-hooks/README.md)

5. **Add Tests**
   - Create test file in `__tests__/`
   - See: [TESTING.md](./TESTING.md)

### Handling a Webhook

```
Stripe Webhook
    ↓
webhook-hooks.ts (signature verification, routing)
    ↓
Controller (orchestration)
    ↓
Services (business logic)
    ↓
Clients/Adapters (external APIs)
```

See: [WEBHOOKS.md](./WEBHOOKS.md)

### Processing a Lifecycle Hook

```
Root Platform Event
    ↓
lifecycle-hooks/index.ts (hook function)
    ↓
Services (business logic)
    ↓
Clients (external APIs)
```

See: [Lifecycle Hooks README](../code/lifecycle-hooks/README.md)

## Key Principles

### 1. Separation of Concerns

- **Hooks/Controllers**: Orchestration
- **Services**: Business logic
- **Clients**: API calls
- **Adapters**: Data transformation
- **Utils**: Reusable helpers

### 2. Dependency Injection

All dependencies injected via constructor.

### 3. Type Safety

TypeScript with interfaces and type-safe configuration.

### 4. Testability

Unit tests with mocked dependencies, integration tests with test containers.

### 5. Logging & Observability

Structured JSON logs with correlation IDs and error context.

## Getting Started

### For New Developers

1. Read [SETUP.md](./SETUP.md) - Set up your environment
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the system
3. Read this document - Navigate the codebase
4. Start with a simple task - Add a log statement or test

### For Implementation

1. Read [CUSTOMIZING.md](./CUSTOMIZING.md) - Implementation guide
2. Read component READMEs - Detailed documentation
3. Look at existing code - Examples and patterns
4. Write tests first - TDD approach

### For Deployment

1. Read [ROOT_CONFIGURATION.md](./ROOT_CONFIGURATION.md) - Configuration
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process
3. Test in sandbox - Verify before production

## Need Help?

### Finding Code

Use the directory structure above and component READMEs to navigate.

### Understanding Patterns

Each README includes:
- Architecture diagrams
- Usage examples
- Best practices
- Anti-patterns

### Troubleshooting

- Check relevant README for your component
- Review [BEST_PRACTICES.md](./BEST_PRACTICES.md)
- Look at test files for examples
- Check logs with [LOG_VIEWING.md](./LOG_VIEWING.md)

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - High-level system design
- **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** - Coding standards
- **[TESTING.md](./TESTING.md)** - Testing strategy
- **[CUSTOMIZING.md](./CUSTOMIZING.md)** - Implementation guide

