# Collection Module Architecture

This document describes the architecture of the Stripe Collection Module template. This template has been rebuilt from the ground up with a focus on testability, maintainability, and clear separation of concerns.

## Overview

The collection module follows a simple service-oriented architecture with dependency injection. It's designed to be easy to understand and extend while providing solid patterns for building integrations.

## Directory Structure

```
collection_module/
├── code/
│   ├── core/                    # Core domain models and DI container
│   │   ├── models/              # Domain model interfaces
│   │   │   ├── customer.model.ts
│   │   │   ├── payment.model.ts
│   │   │   ├── subscription.model.ts
│   │   │   ├── policy.model.ts
│   │   │   └── payment-method.model.ts
│   │   ├── container.ts         # Dependency injection container
│   │   └── container.setup.ts   # Container configuration
│   │
│   ├── services/                # Business logic services
│   │   ├── log.service.ts       # Structured JSON logging
│   │   ├── config.service.ts    # Configuration management
│   │   ├── render.service.ts    # Payment method rendering
│   │   └── root.service.ts      # Root platform operations
│   │
│   ├── clients/                 # API client wrappers
│   │   ├── stripe-client.ts
│   │   └── root-client.ts
│   │
│   ├── adapters/                # Data transformation
│   │   └── stripe-to-root-adapter.ts
│   │
│   ├── lifecycle-hooks/         # Root platform hooks
│   │   └── index.ts             # Main lifecycle hooks
│   │
│   ├── utils/                   # Utilities
│   │   ├── error.ts
│   │   └── logger.ts (legacy)
│   │
│   ├── lifecycle-hooks.ts       # Exports lifecycle hooks
│   ├── webhook-hooks.ts         # Webhook processing
│   ├── config.ts                # Configuration
│   └── main.ts                  # Entry point
│
├── __tests__/                   # Test files
│   ├── core/
│   ├── services/
│   ├── lifecycle-hooks/
│   └── helpers/
│
└── docs/                        # Documentation
    ├── ARCHITECTURE.md
    ├── TESTING.md
    └── LOG_VIEWING.md
```

## Key Architectural Decisions

### 1. Service-Oriented Architecture

All business logic is encapsulated in services. Services are:
- **Injectable** - Accept dependencies via constructor
- **Testable** - Can be easily mocked and tested in isolation
- **Single Responsibility** - Each service has a clear, focused purpose

### 2. Dependency Injection

We use a simple, custom DI container that:
- Manages service lifecycles (singleton vs transient)
- Resolves dependencies automatically
- Makes testing easy through service replacement
- Avoids the complexity of heavy DI frameworks

Example:
```typescript
// Register a service
container.register(
  ServiceToken.LOG_SERVICE,
  () => new LogService({ environment: 'production' }),
  ServiceLifetime.SINGLETON
);

// Resolve a service
const logService = container.resolve<LogService>(ServiceToken.LOG_SERVICE);
```

### 3. Domain Models

Domain models define clear contracts:
- Provider-agnostic where possible
- Specific implementations for Stripe/Root
- Located in `core/models/`
- No business logic, just data structures

### 4. Structured Logging

The `LogService` provides structured JSON logging to stdout for log aggregation systems (DataDog, CloudWatch, etc.)

Features:
- Correlation IDs for request tracking
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Metadata support
- JSON-formatted output for easy parsing

### 5. HTML Rendering

The `RenderService` centralizes all HTML generation:
- Payment method creation forms (Stripe Elements)
- Payment method summary views
- Payment method detail views
- XSS protection via HTML escaping

## Data Flow

### Webhook Processing

```
Stripe Webhook
    ↓
webhook-hooks.ts (signature verification)
    ↓
Event Router (switch on event type)
    ↓
Event-Specific Controller
    ├→ Stripe Client (get details)
    ├→ RootService (update payments)
    └→ LogService (record activities)
```

## Service Descriptions

### LogService
- **Purpose**: Structured JSON logging to stdout
- **Features**: Correlation IDs, JSON formatting, multiple log levels

### ConfigurationService
- **Purpose**: Type-safe, validated configuration management
- **Features**: Environment-specific configs, validation on startup

### RenderService
- **Purpose**: Generate HTML for dashboard views
- **Features**: XSS protection, consistent styling

### RootService
- **Purpose**: Root platform operations
- **Features**: Business logic for Root API interactions

### StripeService
- **Purpose**: Stripe operations
- **Features**: Business logic for Root API interactions

## Extension Points

When implementing the full Stripe/Root integration:

1. **Add Event Controllers**: Create controllers for additional Stripe webhook events
2. **Implement Lifecycle Hooks**: Add logic for payment method assignment, policy updates, etc.
3. **Add Business Services**: Create service layers for complex orchestration logic
4. **Add Validation**: Create input validation for webhook events
5. **Write Tests**: Add comprehensive test coverage for new features

## Testing Strategy

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

Key principles:
- Unit test all services with mocked dependencies
- Test orchestration logic in controllers
- Mock external APIs (Stripe, Root)
- Use the DI container for easy mocking

## Configuration

Configuration is managed via environment variables:
- Loaded in `config.ts`
- Validated on startup
- Injectable for testing

## Error Handling

- Custom `ModuleError` class with structured logging
- Errors include context and metadata
- Stack traces captured and logged
- User-friendly error messages for dashboard

## Security

- Webhook signature verification
- HTML escaping for XSS prevention
- Sensitive data not logged
- Secure environment variable handling

## Next Steps

1. Implement additional Stripe event controllers as needed
2. Add lifecycle hook implementations for your specific use case
3. Create integration tests for critical workflows
4. Set up monitoring and alerting via DataDog/CloudWatch
5. Performance optimization and error handling improvements

## Questions?

For questions or clarifications, consult:
- [TESTING.md](./TESTING.md) - Testing guide
- [CUSTOMIZING.md](./CUSTOMIZING.md) - Implementation guide
- Source code comments and JSDoc

