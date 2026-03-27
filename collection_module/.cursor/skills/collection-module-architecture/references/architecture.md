# Collection Module Architecture (Reference)

## Overview

Service-oriented architecture with dependency injection. Focus on testability, maintainability, and separation of concerns.

## Directory Structure

```
collection_module/
├── code/
│   ├── core/                    # Domain models and DI container
│   │   ├── models/              # Domain model interfaces
│   │   ├── container.ts         # DI container
│   │   └── container.setup.ts   # Container configuration
│   ├── services/                # Business logic
│   ├── clients/                 # API wrappers
│   ├── adapters/                # Data transformation
│   ├── lifecycle-hooks/         # Root platform hooks
│   ├── utils/
│   ├── lifecycle-hooks.ts       # Exports lifecycle hooks
│   ├── webhook-hooks.ts         # Webhook processing
│   ├── config.ts
│   └── main.ts                  # Entry point
├── __tests__/
└── docs/
```

## Key Decisions

- **Services**: Injectable, testable, single responsibility
- **DI**: Custom container; singleton vs transient; service replacement for tests
- **Domain models**: `core/models/`; provider-agnostic where possible; no business logic
- **Logging**: LogService — structured JSON to stdout; correlation IDs; DEBUG/INFO/WARN/ERROR
- **Rendering**: RenderService — HTML for dashboard; XSS protection

## Data Flow

### Webhook

```
Stripe Webhook → webhook-hooks.ts (signature) → Event Router → Controller → Services/Clients/LogService
```

### Lifecycle

```
Root Platform Event → lifecycle-hooks/index.ts → Services → Clients
```

## Services

| Service | Purpose |
|---------|---------|
| LogService | Structured JSON logging |
| ConfigurationService | Type-safe config, validation on startup |
| RenderService | HTML for dashboard views |
| RootService | Root Platform operations |
| StripeService | Stripe operations |

## Extension Points

1. Add event controllers for Stripe webhook events
2. Implement lifecycle hooks (payment method, policy, payment)
3. Add business services for orchestration
4. Add validation for webhook events
5. Write tests for new features

## Configuration, Error Handling, Security

- Config: env vars, loaded in `config.ts`, validated on startup
- Errors: ModuleError with context/metadata; stack traces logged
- Security: Webhook signature verification; HTML escaping; no sensitive data in logs
